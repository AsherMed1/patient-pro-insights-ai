import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchInsuranceCardUrl } from '../_shared/ghl-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a unique request ID for tracking
const generateRequestId = () => crypto.randomUUID()

serve(async (req) => {
  const requestId = generateRequestId()
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`[${requestId}] GHL Webhook received`)
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed', 
          message: 'Use POST to send webhook data',
          requestId
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get raw body for debugging
    const bodyText = await req.text()
    console.log(`[${requestId}] Raw webhook body:`, bodyText.substring(0, 500))

    // Parse JSON with error handling
    let payload
    try {
      payload = JSON.parse(bodyText)
    } catch (parseError) {
      console.error(`[${requestId}] JSON Parse Error:`, parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON format', 
          message: 'Webhook body must be valid JSON',
          details: parseError.message,
          hint: 'Check for unescaped newlines or special characters in the payload',
          requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[${requestId}] Parsed webhook payload:`, JSON.stringify(payload, null, 2))

    // Detect webhook format and extract data
    const webhookData = extractWebhookData(payload, requestId)
    
    if (!webhookData) {
      return new Response(
        JSON.stringify({ 
          error: 'Unsupported webhook format', 
          message: 'Could not extract appointment data from webhook payload',
          requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[${requestId}] Extracted webhook data:`, webhookData)

    // Validate required fields
    if (!webhookData.lead_name || !webhookData.project_name) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          message: 'lead_name and project_name are required',
          extracted: webhookData,
          requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Auto-create project if it doesn't exist
    await ensureProjectExists(supabase, webhookData.project_name, requestId)

    // Check if appointment already exists (returns full record for comparison)
    const existingAppointment = await findExistingAppointment(
      supabase, 
      webhookData.ghl_appointment_id, 
      webhookData.ghl_id,
      webhookData.lead_name,
      requestId
    )

    const isUpdate = !!existingAppointment
    console.log(`[${requestId}] Operation type: ${isUpdate ? 'UPDATE' : 'CREATE'}`)

    // Skip creating NEW appointments with terminal statuses (cancelled, showed, no-show)
    // If appointment already exists, allow status updates as normal
    const terminalStatuses = ['cancelled', 'canceled', 'no show', 'noshow', 'no-show', 'showed', 'attended']
    const incomingStatusLower = webhookData.status?.toLowerCase().trim() || ''
    const isTerminalStatus = terminalStatuses.some(ts => incomingStatusLower.includes(ts))

    if (!isUpdate && isTerminalStatus) {
      console.log(`[${requestId}] ⏭️ Skipping new appointment with terminal status: "${webhookData.status}"`)
      console.log(`[${requestId}] Lead: ${webhookData.lead_name}, Project: ${webhookData.project_name}`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          operation: 'skipped',
          reason: 'Terminal status appointment not in system',
          status: webhookData.status,
          lead_name: webhookData.lead_name,
          message: `Appointment skipped - status "${webhookData.status}" for new appointment not added to system`,
          requestId
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get appropriate fields based on operation type (selective updates for existing appointments)
    const appointmentData = getUpdateableFields(webhookData, existingAppointment)

    console.log(`[${requestId}] Fields to ${isUpdate ? 'update' : 'create'}:`, Object.keys(appointmentData))
    
    // Log preserved local fields for transparency
    if (isUpdate && existingAppointment) {
      console.log(`[${requestId}] Preserving local fields:`, {
        procedure_ordered: existingAppointment.procedure_ordered,
        internal_process_complete: existingAppointment.internal_process_complete,
        notes: existingAppointment.notes ? '(exists)' : null,
        ai_summary: existingAppointment.ai_summary ? '(exists)' : null,
        status: isExplicitStatusChange(webhookData.status) ? `${existingAppointment.status} → ${webhookData.status}` : `${existingAppointment.status} (preserved)`
      })
    }

    // Upsert appointment
    let appointmentRecord
    if (isUpdate && existingAppointment) {
      console.log(`[${requestId}] Updating existing appointment:`, existingAppointment.id)
      const { data, error } = await supabase
        .from('all_appointments')
        .update(appointmentData)
        .eq('id', existingAppointment.id)
        .select()
        .single()
      
      if (error) throw error
      appointmentRecord = data
    } else {
      console.log(`[${requestId}] Creating new appointment`)
      const { data, error } = await supabase
        .from('all_appointments')
        .insert([appointmentData])
        .select()
        .single()
      
      if (error) throw error
      appointmentRecord = data
    }

    console.log(`[${requestId}] Appointment ${isUpdate ? 'updated' : 'created'}:`, appointmentRecord.id)

      // Enrich all appointments with full GHL contact data (if ghl_id available)
      if (appointmentRecord && webhookData.ghl_id) {
        console.log(`[${requestId}] Enriching appointment with full GHL contact data`)
        enrichAppointmentWithGHLData(
          supabase,
          appointmentRecord.id,
          webhookData.ghl_id,
          webhookData.project_name,
          requestId
        )
      } else if (appointmentRecord && appointmentData.patient_intake_notes) {
        // Only trigger basic auto-parsing if no ghl_id (can't fetch from GHL)
        triggerAutoParse(supabase, appointmentRecord.id, requestId)
      }

    // Fetch insurance card in background
    if (appointmentRecord && webhookData.ghl_id && !appointmentData.insurance_id_link) {
      fetchAndUpdateInsuranceCard(
        supabase, 
        appointmentRecord.id, 
        webhookData.ghl_id, 
        webhookData.project_name,
        requestId
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        operation: isUpdate ? 'update' : 'create',
        appointment_id: appointmentRecord.id,
        ghl_appointment_id: webhookData.ghl_appointment_id,
        message: `Appointment ${isUpdate ? 'updated' : 'created'} successfully`,
        requestId
      }),
      { 
        status: isUpdate ? 200 : 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        requestId
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Helper: Extract URL from JSON format or plain string
function extractUrlFromValue(value: any): string | null {
  if (!value) return null;
  
  // If it's already a URL string
  if (typeof value === 'string' && value.startsWith('http')) {
    return value;
  }
  
  // If it's a JSON string, try to parse and extract URL
  if (typeof value === 'string' && value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value);
      // GHL format: {"uuid": {"url": "https://...", ...}}
      for (const key in parsed) {
        if (parsed[key]?.url && typeof parsed[key].url === 'string') {
          return parsed[key].url;
        }
      }
    } catch (e) {
      // Not valid JSON, ignore
    }
  }
  
  // If it's already an object with nested url
  if (typeof value === 'object' && value !== null) {
    for (const key in value) {
      if (value[key]?.url && typeof value[key].url === 'string') {
        return value[key].url;
      }
    }
  }
  
  return null;
}

// Helper: Extract insurance card URL from custom fields
function extractInsuranceCardUrl(customFields: any): string | null {
  const insuranceFieldPatterns = [
    'upload a copy of your insurance card',
    'insurance_card',
    'insurance_photo', 
    'insurance_image',
    'insurance_id_card',
    'front_of_insurance_card',
    'insurance card',
    'card front',
    'insurance front',
    'insurance_id_link'
  ]
  
  if (!customFields) return null
  
  // Handle array of custom fields (standard event format)
  if (Array.isArray(customFields)) {
    for (const field of customFields) {
      const key = (field.key || '').toLowerCase()
      const value = field.value || field.field_value
      
      if (insuranceFieldPatterns.some(pattern => key.includes(pattern))) {
        const extractedUrl = extractUrlFromValue(value);
        if (extractedUrl) {
          console.log(`Found insurance card URL in field "${field.key}": ${extractedUrl}`)
          return extractedUrl
        }
      }
    }
  }
  
  // Handle object of custom fields (workflow format)
  if (typeof customFields === 'object' && !Array.isArray(customFields)) {
    for (const [key, value] of Object.entries(customFields)) {
      const keyLower = key.toLowerCase()
      if (insuranceFieldPatterns.some(pattern => keyLower.includes(pattern))) {
        const extractedUrl = extractUrlFromValue(value);
        if (extractedUrl) {
          console.log(`Found insurance card URL in field "${key}": ${extractedUrl}`)
          return extractedUrl
        }
      }
    }
  }
  
  return null
}

// Extract data from webhook payload (supports both standard event and workflow formats)
function extractWebhookData(payload: any, requestId: string) {
  console.log(`[${requestId}] Detecting webhook format...`)
  
  // Standard Event Webhook Format (AppointmentCreate, AppointmentUpdate)
  if (payload.appointment || payload.type?.includes('appointment')) {
    console.log(`[${requestId}] Detected: Standard Event Webhook`)
    return extractStandardEventFormat(payload)
  }
  
  // Workflow Webhook Format (flattened structure with calendar object)
  if (payload.calendar || payload.contact_id || payload.first_name) {
    console.log(`[${requestId}] Detected: Workflow Webhook`)
    return extractWorkflowFormat(payload)
  }
  
  console.log(`[${requestId}] Unknown webhook format`)
  return null
}

// Extract from Standard Event Webhook
function extractStandardEventFormat(payload: any) {
  const apt = payload.appointment || {}
  const contact = apt.contact || {}
  
  // Parse appointment start time
  let dateOfAppointment = null
  let requestedTime = null
  if (apt.startTime) {
    const startDate = new Date(apt.startTime)
    if (!isNaN(startDate.getTime())) {
      dateOfAppointment = startDate.toISOString().split('T')[0] // YYYY-MM-DD
      requestedTime = startDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    }
  }
  
  // Format patient intake notes from contact custom fields
  const patientIntakeNotes = formatCustomFieldsToNotes(contact.customFields || apt.customFields || [])
  
  // Extract project name - prioritize location name (sub-account) over calendar name
  const calendarName = apt.calendarName || apt.calendar?.name || 'Unknown'
  const locationName = payload.location?.name
  const projectName = locationName || extractProjectFromCalendar(calendarName)
  
  return {
    ghl_appointment_id: apt.id || apt.appointmentId,
    ghl_id: apt.contactId || contact.id,
    ghl_location_id: payload.location?.id || null,
    status: normalizeStatus(apt.appointmentStatus || apt.status),
    date_of_appointment: dateOfAppointment,
    requested_time: requestedTime,
    date_appointment_created: apt.dateAdded || new Date().toISOString(),
    patient_intake_notes: patientIntakeNotes || apt.notes,
    lead_name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
    lead_phone_number: contact.phone,
    lead_email: contact.email,
    dob: normalizeDob(contact.dateOfBirth || contact.dob),
    calendar_name: calendarName,
    project_name: projectName,
    insurance_id_link: extractInsuranceCardUrl(contact.customFields || apt.customFields),
  }
}

// Extract from Workflow Webhook
function extractWorkflowFormat(payload: any) {
  const calendar = payload.calendar || {}
  
  // Parse appointment start time
  let dateOfAppointment = null
  let requestedTime = null
  if (calendar.startTime) {
    const startDate = new Date(calendar.startTime)
    if (!isNaN(startDate.getTime())) {
      dateOfAppointment = startDate.toISOString().split('T')[0]
      requestedTime = startDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    }
  }
  
  // Format patient intake notes from customFields object (NOT root-level custom_ fields)
  const customFieldsObj = payload.customFields || {}
  const customFields = Object.entries(customFieldsObj)
    .filter(([key, value]) => value && value !== 'null' && value !== 'undefined')
    .map(([key, value]) => ({ key, value }))
  const patientIntakeNotes = formatCustomFieldsToNotes(customFields)
  
  // Extract project name - prioritize location name (sub-account) over calendar name
  const calendarName = calendar.calendarName || calendar.name || 'Unknown'
  const locationName = payload.location?.name
  const projectName = locationName || extractProjectFromCalendar(calendarName)
  
  return {
    ghl_appointment_id: calendar.appointmentId || payload.appointment_id,
    ghl_id: payload.contact_id || payload.contactId,
    ghl_location_id: payload.location?.id || null,
    status: normalizeStatus(calendar.status || payload.status),
    date_of_appointment: dateOfAppointment,
    requested_time: requestedTime,
    date_appointment_created: calendar.dateAdded || payload.date_added || new Date().toISOString(),
    patient_intake_notes: patientIntakeNotes || calendar.notes || payload.notes,
    lead_name: payload.full_name || `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
    lead_phone_number: payload.phone || payload.phone_number,
    lead_email: payload.email,
    dob: normalizeDob(payload.date_of_birth || payload.dob),
    calendar_name: calendarName,
    project_name: projectName,
    insurance_id_link: extractInsuranceCardUrl(payload.customFields || customFieldsObj),
  }
}

// Format custom fields into structured patient intake notes
function formatCustomFieldsToNotes(customFields: any[]): string | null {
  if (!customFields || customFields.length === 0) return null
  
  let notes = ''
  const sections = {
    contact: [] as string[],
    insurance: [] as string[],
    pathology: [] as string[],
    medical: [] as string[]
  }
  
  for (const field of customFields) {
    const key = field.key?.toLowerCase() || ''
    const value = field.value
    if (!value) continue
    
    // Categorize fields - enhanced for Vivid Vascular PAE/UFE/GAE patterns
    if (key.includes('insurance') || key.includes('plan') || key.includes('group') || key.includes('member')) {
      sections.insurance.push(`${field.key}: ${value}`)
    } else if (
      key.includes('pain') || key.includes('symptom') || key.includes('duration') || 
      key.includes('treatment') || key.includes('prefer') || key.includes('surgical') ||
      key.includes('non-surgical') || key.includes('nonsurgical') || key.includes('procedure') ||
      key.includes('pae') || key.includes('ufe') || key.includes('gae') ||
      key.includes('prostate') || key.includes('fibroid') || key.includes('uterine') ||
      key.includes('gastric') || key.includes('embolization') || key.includes('consultation') ||
      key.includes('concern') || key.includes('complaint') || key.includes('reason')
    ) {
      sections.pathology.push(`${field.key}: ${value}`)
    } else if (key.includes('medication') || key.includes('allergy') || key.includes('pcp') || key.includes('doctor')) {
      sections.medical.push(`${field.key}: ${value}`)
    } else {
      sections.contact.push(`${field.key}: ${value}`)
    }
  }
  
  // Build formatted notes
  if (sections.contact.length > 0) notes += `**Contact:** ${sections.contact.join(' | ')}\n\n`
  if (sections.insurance.length > 0) notes += `**Insurance:** ${sections.insurance.join(' | ')}\n\n`
  if (sections.pathology.length > 0) notes += `**Pathology:** ${sections.pathology.join(' | ')}\n\n`
  if (sections.medical.length > 0) notes += `**Medical:** ${sections.medical.join(' | ')}`
  
  return notes.trim() || null
}

// Extract project name from calendar name
function extractProjectFromCalendar(calendarName: string): string {
  if (!calendarName) return 'Unknown'
  
  // Format 1: "Request Your GAE Consultation - Location"
  if (calendarName.includes(' - ')) {
    const parts = calendarName.split(' - ')
    return parts[0].trim()
  }
  
  // Format 2: "Request your GAE Consultation at Location"
  if (calendarName.toLowerCase().includes(' at ')) {
    const parts = calendarName.toLowerCase().split(' at ')
    return parts[0].trim()
  }
  
  return calendarName
}

// Check if status represents an explicit change from GHL
function isExplicitStatusChange(status: string | null | undefined): boolean {
  if (!status) return false
  const s = status.toLowerCase().trim()
  
  // These are explicit status changes from GHL that should be respected
  const explicitStatuses = [
    'cancelled', 'canceled',
    'no show', 'noshow', 'no-show',
    'showed', 'attended',
    'rescheduled',
    'confirmed',
    'oon', 'out of network'
  ]
  
  return explicitStatuses.some(es => s.includes(es) || s === es)
}

// Normalize appointment status
function normalizeStatus(status: string | null | undefined): string {
  // Always default new appointments to "Confirmed"
  if (!status) return 'Confirmed'
  const s = status.toLowerCase().trim()
  
  // New/booked/null appointments → "Confirmed"
  if (s === 'null' || s === 'undefined' || s === '' || s === 'booked' || s === 'new') return 'Confirmed'
  
  // Already confirmed → "Confirmed"
  if (s === 'confirmed') return 'Confirmed'
  
  // Preserve other statuses with proper casing for UI dropdown
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled'
  if (s.includes('no show') || s === 'noshow' || s === 'no-show') return 'No Show'
  if (s === 'showed' || s === 'attended') return 'Showed'
  if (s === 'rescheduled') return 'Rescheduled'
  if (s === 'pending') return 'Pending'
  if (s === 'scheduled') return 'Scheduled'
  if (s === 'oon' || s === 'out of network') return 'OON'
  if (s === 'welcome call') return 'Welcome Call'
  
  // Default fallback
  return 'Confirmed'
}

// Get fields to update based on operation type (CREATE vs UPDATE)
function getUpdateableFields(
  webhookData: any, 
  existingAppointment: any | null
): Record<string, any> {
  // For CREATE - use all webhook data
  if (!existingAppointment) {
    return {
      date_appointment_created: webhookData.date_appointment_created || new Date().toISOString(),
      lead_name: webhookData.lead_name,
      project_name: webhookData.project_name,
      date_of_appointment: webhookData.date_of_appointment,
      requested_time: webhookData.requested_time,
      lead_email: webhookData.lead_email,
      lead_phone_number: webhookData.lead_phone_number,
      calendar_name: webhookData.calendar_name,
      ghl_id: webhookData.ghl_id,
      ghl_appointment_id: webhookData.ghl_appointment_id,
      ghl_location_id: webhookData.ghl_location_id,
      status: webhookData.status,
      patient_intake_notes: webhookData.patient_intake_notes,
      dob: webhookData.dob,
      was_ever_confirmed: webhookData.status?.toLowerCase() === 'confirmed',
    }
  }
  
  // For UPDATE - selective fields only
  const updateFields: Record<string, any> = {}
  
  // Always accept date/time changes (rescheduling)
  if (webhookData.date_of_appointment !== undefined) {
    updateFields.date_of_appointment = webhookData.date_of_appointment
  }
  if (webhookData.requested_time !== undefined) {
    updateFields.requested_time = webhookData.requested_time
  }
  
  // Always accept calendar and location updates
  if (webhookData.calendar_name) {
    updateFields.calendar_name = webhookData.calendar_name
  }
  if (webhookData.ghl_location_id) {
    updateFields.ghl_location_id = webhookData.ghl_location_id
  }
  
  // Conditionally update status (only for explicit changes)
  const incomingStatus = webhookData.status?.toLowerCase()
  if (isExplicitStatusChange(incomingStatus)) {
    updateFields.status = webhookData.status
  }
  
  // Merge contact info (only if local is empty)
  if (!existingAppointment.lead_email && webhookData.lead_email) {
    updateFields.lead_email = webhookData.lead_email
  }
  if (!existingAppointment.lead_phone_number && webhookData.lead_phone_number) {
    updateFields.lead_phone_number = webhookData.lead_phone_number
  }
  if (!existingAppointment.dob && webhookData.dob) {
    updateFields.dob = webhookData.dob
  }
  
  // Insurance card link - update if local is empty
  if (!existingAppointment.insurance_id_link && webhookData.insurance_id_link) {
    updateFields.insurance_id_link = webhookData.insurance_id_link
  }
  
  // Patient intake notes - enrich existing notes with GHL data
  if (webhookData.patient_intake_notes) {
    // If local notes are empty, set them
    if (!existingAppointment.patient_intake_notes) {
      updateFields.patient_intake_notes = webhookData.patient_intake_notes
    } 
    // If local notes exist but don't have GHL structured data, append it
    else if (!existingAppointment.patient_intake_notes.includes('**Contact:**')) {
      updateFields.patient_intake_notes = existingAppointment.patient_intake_notes + '\n\n' + webhookData.patient_intake_notes
    }
  }
  
  // was_ever_confirmed - only set to true, never back to false
  if (webhookData.status?.toLowerCase() === 'confirmed' && !existingAppointment.was_ever_confirmed) {
    updateFields.was_ever_confirmed = true
  }
  
  return updateFields
}

// Normalize DOB to YYYY-MM-DD
function normalizeDob(dob: any): string | null {
  if (!dob) return null
  
  if (typeof dob === 'string') {
    const s = dob.trim()
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    
    // ISO timestamp
    if (s.includes('T')) {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
    
    // MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [m, d, y] = s.split('/').map(Number)
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    
    // Month DDth YYYY (e.g., "Aug 18th 2022")
    const monthMatch = s.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})$/i)
    if (monthMatch) {
      const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
      const monthIndex = months.indexOf(monthMatch[1].toLowerCase().slice(0, 3))
      if (monthIndex >= 0) {
        const day = parseInt(monthMatch[2], 10)
        const year = parseInt(monthMatch[3], 10)
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }
  
  if (dob instanceof Date && !isNaN(dob.getTime())) {
    return dob.toISOString().slice(0, 10)
  }
  
  return null
}

// Ensure project exists, create if not
async function ensureProjectExists(supabase: any, projectName: string, requestId: string) {
  console.log(`[${requestId}] Checking if project exists: ${projectName}`)
  
  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('project_name', projectName)
    .maybeSingle()
  
  if (!existing) {
    console.log(`[${requestId}] Project not found, creating: ${projectName}`)
    const { error } = await supabase
      .from('projects')
      .insert([{ 
        project_name: projectName, 
        active: true 
      }])
    
    if (error) {
      console.error(`[${requestId}] Failed to create project:`, error)
    } else {
      console.log(`[${requestId}] Project created successfully: ${projectName}`)
    }
  } else {
    console.log(`[${requestId}] Project exists: ${projectName}`)
  }
}

// Find existing appointment (returns full record for field comparison)
async function findExistingAppointment(
  supabase: any, 
  ghlAppointmentId: string | null, 
  ghlId: string | null,
  leadName: string,
  requestId: string
) {
  console.log(`[${requestId}] Searching for existing appointment...`)
  
  // Try by GHL appointment ID first
  if (ghlAppointmentId) {
    const { data } = await supabase
      .from('all_appointments')
      .select('*')  // Full record for field comparison
      .eq('ghl_appointment_id', ghlAppointmentId)
      .maybeSingle()
    
    if (data) {
      console.log(`[${requestId}] Found by ghl_appointment_id: ${data.id}`)
      return data
    }
  }
  
  // Try by GHL contact ID + name (use limit(1) + order to handle duplicates)
  if (ghlId) {
    const { data: records } = await supabase
      .from('all_appointments')
      .select('*')
      .eq('ghl_id', ghlId)
      .eq('lead_name', leadName)
      .order('created_at', { ascending: true })
      .limit(1)
    
    if (records && records.length > 0) {
      console.log(`[${requestId}] Found by ghl_id + name: ${records[0].id}`)
      return records[0]
    }
    
    // Fallback: try ghl_id only (in case name changed)
    const { data: byContactOnly } = await supabase
      .from('all_appointments')
      .select('*')
      .eq('ghl_id', ghlId)
      .order('created_at', { ascending: true })
      .limit(1)
    
    if (byContactOnly && byContactOnly.length > 0) {
      console.log(`[${requestId}] Found by ghl_id only: ${byContactOnly[0].id}`)
      return byContactOnly[0]
    }
  }
  
  console.log(`[${requestId}] No existing appointment found`)
  return null
}

// Trigger auto-parse in background (don't await)
function triggerAutoParse(supabase: any, appointmentId: string, requestId: string) {
  console.log(`[${requestId}] Triggering auto-parse for appointment: ${appointmentId}`)
  
  supabase.functions.invoke('auto-parse-intake-notes', {
    body: { trigger: 'immediate', appointment_id: appointmentId }
  }).then(({ data, error }: any) => {
    if (error) {
      console.error(`[${requestId}] Auto-parse failed:`, error)
    } else {
      console.log(`[${requestId}] Auto-parse triggered:`, data)
    }
  })
}

// Fetch and update insurance card in background (don't await)
async function fetchAndUpdateInsuranceCard(
  supabase: any, 
  appointmentId: string, 
  ghlId: string, 
  projectName: string,
  requestId: string
) {
  try {
    console.log(`[${requestId}] Fetching insurance card for: ${ghlId}`)
    
    // Get project-specific or global GHL API key
    let ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY')
    
    const { data: project } = await supabase
      .from('projects')
      .select('ghl_api_key')
      .eq('project_name', projectName)
      .single()
    
    if (project?.ghl_api_key) {
      ghlApiKey = project.ghl_api_key
    }
    
    if (!ghlApiKey) {
      console.log(`[${requestId}] No GHL API key configured`)
      return
    }
    
    const insuranceCardUrl = await fetchInsuranceCardUrl(ghlId, ghlApiKey)
    
    if (insuranceCardUrl) {
      console.log(`[${requestId}] Found insurance card, updating appointment`)
      await supabase
        .from('all_appointments')
        .update({ insurance_id_link: insuranceCardUrl })
        .eq('id', appointmentId)
    }
  } catch (error) {
    console.error(`[${requestId}] Insurance card fetch failed:`, error)
  }
}

// Enrich appointments with full GHL contact data
async function enrichAppointmentWithGHLData(
  supabase: any,
  appointmentId: string,
  contactId: string,
  projectName: string,
  requestId: string
) {
  try {
    console.log(`[${requestId}] Enriching appointment with full GHL data`)
    
    // Get project's GHL credentials
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('ghl_api_key, ghl_location_id')
      .eq('project_name', projectName)
      .single()
    
    if (projectError || !project?.ghl_api_key || !project?.ghl_location_id) {
      console.log(`[${requestId}] Missing GHL credentials for project:`, projectName)
      return
    }
    
    const ghlApiKey = project.ghl_api_key
    const ghlLocationId = project.ghl_location_id
    const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
    const GHL_API_VERSION = '2021-07-28'
    
    // Fetch custom field definitions
    console.log(`[${requestId}] Fetching custom field definitions`)
    const customFieldDefsRes = await fetch(`${GHL_BASE_URL}/locations/${ghlLocationId}/customFields`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
    })
    
    const customFieldDefs: Record<string, string> = {}
    if (customFieldDefsRes.ok) {
      const defsData = await customFieldDefsRes.json()
      const defs = defsData.customFields || []
      defs.forEach((def: any) => {
        if (def.id && def.name) {
          customFieldDefs[def.id] = def.name
        }
      })
      console.log(`[${requestId}] Loaded ${Object.keys(customFieldDefs).length} custom field definitions`)
    }
    
    // Fetch full contact data
    console.log(`[${requestId}] Fetching full contact data for: ${contactId}`)
    const contactRes = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
    })
    
    if (!contactRes.ok) {
      const errorText = await contactRes.text()
      console.error(`[${requestId}] GHL API error fetching contact:`, errorText)
      return
    }
    
    const contactData = await contactRes.json()
    const contact = contactData.contact ?? contactData
    
    if (!contact) {
      console.error(`[${requestId}] No contact data returned from GHL`)
      return
    }
    
    // Extract basic contact info from root level (NOT in customFields)
    const basicContactInfo = {
      'First Name': contact.firstName,
      'Last Name': contact.lastName,
      'Full Name': [contact.firstName, contact.lastName].filter(Boolean).join(' '),
      'Email': contact.email,
      'Phone': contact.phone,
      'Date of Birth': contact.dateOfBirth,
      'Address': contact.address1,
      'City': contact.city,
      'State': contact.state,
      'Postal Code': contact.postalCode,
      'Country': contact.country,
      'Gender': contact.gender,
    }
    
    console.log(`[${requestId}] Extracted root-level contact info:`, Object.keys(basicContactInfo).filter(k => basicContactInfo[k]))
    
    // Format custom fields into structured patient intake notes
    const rawCustomFields = contact.customFields || []
    const customFields = rawCustomFields
      .map((field: any) => ({
        id: field.id,
        key: customFieldDefs[field.id] || field.key || `Unknown Field (${field.id})`,
        value: field.field_value ?? field.value,
      }))
      .filter(f => f.value) // Only include fields with values
    
    console.log(`[${requestId}] Processing ${customFields.length} custom fields`)
    
    // Categorize and format custom fields
    const sections: Record<string, string[]> = {
      'Contact Information': [],
      'Insurance Information': [],
      'Pathology Information': [],
      'Medical Information': []
    }
    
    // Add basic contact info to Contact Information section FIRST
    Object.entries(basicContactInfo).forEach(([key, value]) => {
      if (value && value !== 'null' && value !== 'undefined') {
        sections['Contact Information'].push(`${key}: ${value}`)
      }
    })
    
    customFields.forEach(field => {
      if (!field.key) return
      
      const key = field.key.toLowerCase()
      const value = Array.isArray(field.value) 
        ? field.value.join(', ') 
        : typeof field.value === 'object' && field.value !== null
          ? JSON.stringify(field.value)
          : (field.value || 'Not provided')
      
      const formattedLine = `${field.key}: ${value}`
      
      // Categorize fields - skip conversation notes and workflow fields
      // Enhanced for Vivid Vascular PAE/UFE/GAE procedure patterns
      if (key.includes('insurance') || key.includes('member') || key.includes('group') || key.includes('policy')) {
        sections['Insurance Information'].push(formattedLine)
      } else if (
        key.includes('pain') || key.includes('symptom') || key.includes('condition') || 
        key.includes('diagnosis') || key.includes('affected') || key.includes('duration') || 
        key.includes('treat') || key.includes('prefer') || key.includes('surgical') ||
        key.includes('non-surgical') || key.includes('nonsurgical') || key.includes('procedure') ||
        key.includes('pae') || key.includes('ufe') || key.includes('gae') ||
        key.includes('prostate') || key.includes('fibroid') || key.includes('uterine') ||
        key.includes('gastric') || key.includes('embolization') || key.includes('consultation') ||
        key.includes('concern') || key.includes('complaint') || key.includes('reason')
      ) {
        sections['Pathology Information'].push(formattedLine)
      } else if (key.includes('medication') || key.includes('allerg') || key.includes('medical') || key.includes('pcp') || key.includes('doctor')) {
        sections['Medical Information'].push(formattedLine)
      } else if (key.includes('phone') || key.includes('email') || key.includes('address') || key.includes('contact') || key.includes('name') || key.includes('dob') || key.includes('date of birth')) {
        sections['Contact Information'].push(formattedLine)
      }
    })
    
    // Build formatted text
    let formattedNotes = '=== GHL Contact Data (Full) ===\n\n'
    Object.entries(sections).forEach(([section, lines]) => {
      if (lines.length > 0) {
        formattedNotes += `${section}:\n`
        lines.forEach(line => {
          formattedNotes += `  ${line}\n`
        })
        formattedNotes += '\n'
      }
    })
    
    // Get current patient intake notes
    const { data: appointment } = await supabase
      .from('all_appointments')
      .select('patient_intake_notes')
      .eq('id', appointmentId)
      .single()
    
    const currentNotes = appointment?.patient_intake_notes || ''
    const updatedNotes = currentNotes 
      ? `${currentNotes}\n\n${formattedNotes}`
      : formattedNotes
    
    // Helper function to calculate age from DOB
    const calculateAge = (dobString: string | null): number | null => {
      if (!dobString) return null
      
      try {
        const dob = new Date(dobString)
        if (isNaN(dob.getTime())) return null
        
        const today = new Date()
        if (dob > today) return null // Future date
        
        let age = today.getFullYear() - dob.getFullYear()
        const monthDiff = today.getMonth() - dob.getMonth()
        
        // Adjust if birthday hasn't occurred yet this year
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--
        }
        
        return age >= 0 ? age : null
      } catch {
        return null
      }
    }
    
    // Prepare parsed fields from root-level contact data
    const parsedContactInfo = {
      name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || null,
      email: contact.email || null,
      phone: contact.phone || null,
      dob: contact.dateOfBirth || null,
      address: [contact.address1, contact.city, contact.state, contact.postalCode].filter(Boolean).join(', ') || null
    }
    
    const parsedDemographics = {
      dob: contact.dateOfBirth || null,
      age: calculateAge(contact.dateOfBirth),
      gender: contact.gender || null
    }
    
    // Update appointment with enriched notes AND parsed fields
    const { error: updateError } = await supabase
      .from('all_appointments')
      .update({ 
        patient_intake_notes: updatedNotes,
        parsed_contact_info: parsedContactInfo,
        parsed_demographics: parsedDemographics,
        dob: contact.dateOfBirth || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
    
    if (updateError) {
      console.error(`[${requestId}] Failed to update appointment with enriched notes:`, updateError)
      return
    }
    
    console.log(`[${requestId}] ✅ Successfully enriched appointment with ${customFields.length} custom fields`)
    
    // Trigger auto-parsing to populate Patient Pro Insights
    triggerAutoParse(supabase, appointmentId, requestId)
    
  } catch (error) {
    console.error(`[${requestId}] Enrichment failed:`, error)
  }
}
