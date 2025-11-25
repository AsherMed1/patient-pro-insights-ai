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

    // Check if appointment already exists
    const existingAppointment = await findExistingAppointment(
      supabase, 
      webhookData.ghl_appointment_id, 
      webhookData.ghl_id,
      webhookData.lead_name,
      requestId
    )

    const isUpdate = !!existingAppointment
    console.log(`[${requestId}] Operation type: ${isUpdate ? 'UPDATE' : 'CREATE'}`)

    // Prepare appointment data
    const appointmentData = {
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
      status: webhookData.status,
      patient_intake_notes: webhookData.patient_intake_notes,
      dob: webhookData.dob,
      was_ever_confirmed: webhookData.status?.toLowerCase() === 'confirmed' ? true : undefined,
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

    // Trigger auto-parsing in background
    if (appointmentRecord && appointmentData.patient_intake_notes) {
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
  
  // Extract project name from calendar name
  const calendarName = apt.calendarName || apt.calendar?.name || 'Unknown'
  const projectName = extractProjectFromCalendar(calendarName)
  
  return {
    ghl_appointment_id: apt.id || apt.appointmentId,
    ghl_id: apt.contactId || contact.id,
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
    insurance_id_link: null, // Will be fetched separately
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
  
  // Format patient intake notes from root-level custom fields
  const customFields = []
  for (const key in payload) {
    if (key.startsWith('custom_') || key.includes('field_')) {
      customFields.push({ key, value: payload[key] })
    }
  }
  const patientIntakeNotes = formatCustomFieldsToNotes(customFields)
  
  // Extract project name from calendar name
  const calendarName = calendar.calendarName || calendar.name || 'Unknown'
  const projectName = extractProjectFromCalendar(calendarName)
  
  return {
    ghl_appointment_id: calendar.appointmentId || payload.appointment_id,
    ghl_id: payload.contact_id || payload.contactId,
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
    insurance_id_link: null,
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
    
    // Categorize fields
    if (key.includes('insurance') || key.includes('plan') || key.includes('group') || key.includes('member')) {
      sections.insurance.push(`${field.key}: ${value}`)
    } else if (key.includes('pain') || key.includes('symptom') || key.includes('duration') || key.includes('treatment')) {
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

// Normalize appointment status
function normalizeStatus(status: string | null | undefined): string | null {
  if (!status) return null
  const s = status.toLowerCase().trim()
  if (s === 'confirmed') return 'confirmed'
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  if (s.includes('no show') || s === 'noshow') return 'no show'
  if (s === 'showed' || s === 'attended') return 'showed'
  return status
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

// Find existing appointment
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
      .select('id')
      .eq('ghl_appointment_id', ghlAppointmentId)
      .maybeSingle()
    
    if (data) {
      console.log(`[${requestId}] Found by ghl_appointment_id: ${data.id}`)
      return data
    }
  }
  
  // Try by GHL contact ID + name
  if (ghlId) {
    const { data } = await supabase
      .from('all_appointments')
      .select('id')
      .eq('ghl_id', ghlId)
      .eq('lead_name', leadName)
      .maybeSingle()
    
    if (data) {
      console.log(`[${requestId}] Found by ghl_id + name: ${data.id}`)
      return data
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
