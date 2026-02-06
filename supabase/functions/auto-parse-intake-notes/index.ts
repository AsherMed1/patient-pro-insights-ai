import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

// Helper to fetch GHL custom fields with appointment-based contact ID verification
async function fetchGHLCustomFields(
  ghlId: string,
  ghlAppointmentId: string | null,
  ghlApiKey: string, 
  ghlLocationId: string
): Promise<any | null> {
  try {
    let contactId = ghlId;
    let locationId = ghlLocationId;
    
    // If we have an appointment ID, fetch it first to get the TRUE contact ID
    if (ghlAppointmentId) {
      console.log(`[AUTO-PARSE GHL] Fetching appointment ${ghlAppointmentId} to verify contact ID...`);
      const apptRes = await fetch(`${GHL_BASE_URL}/calendars/events/appointments/${ghlAppointmentId}`, {
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Version': GHL_API_VERSION,
        },
      });
      
      if (apptRes.ok) {
        const apptData = await apptRes.json();
        const appt = apptData.appointment ?? apptData;
        const extractedContactId = appt?.contactId || appt?.contact_id || appt?.contact?.id;
        const extractedLocationId = appt?.locationId || appt?.location_id || appt?.location?.id;
        
        if (extractedContactId) {
          console.log(`[AUTO-PARSE GHL] Found contact ID from appointment: ${extractedContactId} (was: ${contactId})`);
          contactId = extractedContactId;
        }
        if (extractedLocationId) {
          locationId = extractedLocationId;
        }
      } else {
        console.log(`[AUTO-PARSE GHL] Failed to fetch appointment: ${apptRes.status}`);
      }
    }
    
    console.log(`[AUTO-PARSE GHL] Fetching custom field definitions for location ${locationId}`);
    
    // Fetch custom field definitions to map IDs to names
    const defsRes = await fetch(`${GHL_BASE_URL}/locations/${locationId}/customFields`, {
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': GHL_API_VERSION,
      },
    });
    
    const customFieldDefs: Record<string, string> = {};
    if (defsRes.ok) {
      const defsData = await defsRes.json();
      (defsData.customFields || []).forEach((def: any) => {
        if (def.id && def.name) customFieldDefs[def.id] = def.name;
      });
      console.log(`[AUTO-PARSE GHL] Found ${Object.keys(customFieldDefs).length} custom field definitions`);
    }

    console.log(`[AUTO-PARSE GHL] Fetching contact ${contactId} with LocationId header`);
    
    // Fetch contact WITH LocationId header (required by GHL API)
    const contactRes = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': GHL_API_VERSION,
        'LocationId': locationId,
      },
    });

    if (!contactRes.ok) {
      console.error(`[AUTO-PARSE GHL] Failed to fetch contact: ${contactRes.status}`);
      const errorText = await contactRes.text();
      console.error(`[AUTO-PARSE GHL] Contact fetch error details: ${errorText}`);
      return null;
    }

    const contactData = await contactRes.json();
    const contact = contactData.contact ?? contactData;
    
    console.log(`[AUTO-PARSE GHL] Successfully fetched contact data with ${contact.customFields?.length || 0} custom fields`);
    
    // Return both contact data and the resolved contactId (for DB update if different)
    return { contact, customFieldDefs, resolvedContactId: contactId };
  } catch (error) {
    console.error('[AUTO-PARSE GHL] Fetch error:', error);
    return null;
  }
}

// Helper: Extract URL from JSON format or plain string (GHL file upload format)
function extractUrlFromJsonOrString(value: any): string | null {
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

// Helper: Extract insurance card URL from patient_intake_notes text
function extractInsuranceUrlFromText(text: string | null): string | null {
  if (!text || typeof text !== 'string') return null;
  
  // Pattern 1: GHL document download URLs (most common format)
  const ghlDocPattern = /https:\/\/services\.leadconnectorhq\.com\/documents\/download\/[a-zA-Z0-9_-]+/g;
  const ghlMatches = text.match(ghlDocPattern);
  if (ghlMatches && ghlMatches.length > 0) {
    console.log(`[AUTO-PARSE] Found GHL document URL in intake notes: ${ghlMatches[0]}`);
    return ghlMatches[0];
  }
  
  // Pattern 2: GHL storage/media URLs
  const ghlStoragePattern = /https:\/\/storage\.leadconnectorhq\.com\/[^\s<>"']+/g;
  const ghlStorageMatches = text.match(ghlStoragePattern);
  if (ghlStorageMatches && ghlStorageMatches.length > 0) {
    console.log(`[AUTO-PARSE] Found GHL storage URL in intake notes: ${ghlStorageMatches[0]}`);
    return ghlStorageMatches[0];
  }
  
  // Pattern 3: Look for URLs near insurance-related text (within 200 chars of keyword)
  const insuranceKeywords = ['insurance card', 'insurance id', 'insurance_card', 'card photo', 'card image', 'id card'];
  const lowerText = text.toLowerCase();
  
  for (const keyword of insuranceKeywords) {
    const keywordIndex = lowerText.indexOf(keyword);
    if (keywordIndex !== -1) {
      // Extract a window of text around the keyword
      const startIdx = Math.max(0, keywordIndex - 50);
      const endIdx = Math.min(text.length, keywordIndex + 200);
      const window = text.substring(startIdx, endIdx);
      
      // Look for any URL in this window
      const urlPattern = /https?:\/\/[^\s<>"']+/g;
      const urlMatches = window.match(urlPattern);
      if (urlMatches && urlMatches.length > 0) {
        console.log(`[AUTO-PARSE] Found URL near "${keyword}" in intake notes: ${urlMatches[0]}`);
        return urlMatches[0];
      }
    }
  }
  
  return null;
}

// Helper to extract urologist info from raw intake notes text
function extractUrologistFromText(text: string | null): { name: string | null, phone: string | null } {
  if (!text) return { name: null, phone: null };
  
  // Pattern: "Urologist's Name and Phone Number: dr pen 6272893382"
  const patterns = [
    /Urologist['']?s?\s+Name\s+and\s+Phone\s+Number:\s*(.+?)(?:\n|$)/i,
    /Urologist['']?s?\s+Name.*?:\s*(.+?)(?:\n|$)/i,
    /Urologist:\s*(.+?)(?:\n|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      // Extract phone (10+ digit number)
      const phoneMatch = value.match(/(\d{10,})/);
      if (phoneMatch) {
        const phone = phoneMatch[1];
        const name = value.replace(phone, '').trim();
        console.log(`[AUTO-PARSE] Extracted urologist from text: name="${name}", phone="${phone}"`);
        return { name: name || value, phone };
      }
      console.log(`[AUTO-PARSE] Extracted urologist name from text (no phone): "${value}"`);
      return { name: value, phone: null };
    }
  }
  
  return { name: null, phone: null };
}

// Fallback regex parser for when OpenAI is unavailable (rate limited, etc.)
function fallbackRegexParsing(intakeNotes: string): any {
  console.log('[AUTO-PARSE FALLBACK] Using regex-based fallback parsing...');
  
  const result = {
    insurance_info: {
      insurance_provider: null as string | null,
      insurance_plan: null as string | null,
      insurance_id_number: null as string | null,
      insurance_group_number: null as string | null,
      insurance_notes: null as string | null
    },
    contact_info: {
      name: null as string | null,
      email: null as string | null,
      phone: null as string | null,
      address: null as string | null,
      dob: null as string | null
    },
    demographics: {
      age: null as string | null,
      gender: null as string | null,
      dob: null as string | null
    },
    pathology_info: {
      procedure_type: null as string | null,
      primary_complaint: null as string | null,
      symptoms: null as string | null,
      pain_level: null as string | null,
      affected_area: null as string | null,
      affected_knee: null as string | null,
      duration: null as string | null,
      previous_treatments: null as string | null,
      oa_tkr_diagnosed: null as string | null,
      imaging_done: null as string | null
    },
    medical_info: {
      pcp_name: null as string | null,
      pcp_phone: null as string | null,
      imaging_details: null as string | null,
      xray_details: null as string | null,
      medications: null as string | null,
      allergies: null as string | null
    }
  };

  if (!intakeNotes) return result;

  // Extract imaging details (critical field)
  const imagingPatterns = [
    /had_imaging_before:\s*([^\n|]+)/i,
    /have you had.*?imaging.*?:\s*([^\n|]+)/i,
    /imaging_done:\s*([^\n|]+)/i,
    /imaging before:\s*([^\n|]+)/i,
    /previous imaging:\s*([^\n|]+)/i
  ];
  
  for (const pattern of imagingPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      result.medical_info.imaging_details = value;
      // Also set imaging_done flag
      const lowerValue = value.toLowerCase();
      if (lowerValue.startsWith('yes') || lowerValue.includes('☑️ yes')) {
        result.pathology_info.imaging_done = 'YES';
      } else if (lowerValue.startsWith('no') || lowerValue.includes('☐ no')) {
        result.pathology_info.imaging_done = 'NO';
      }
      console.log(`[AUTO-PARSE FALLBACK] Extracted imaging_details: ${value}`);
      break;
    }
  }

  // Extract insurance provider
  const insuranceProviderPatterns = [
    /Please select your insurance provider:\s*([^\n|]+)/i,
    /insurance provider:\s*([^\n|]+)/i,
    /insurance:\s*([^\n|]+)/i,
    /Plan:\s*([^\n|]+)/i
  ];
  
  for (const pattern of insuranceProviderPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      result.insurance_info.insurance_provider = match[1].trim();
      result.insurance_info.insurance_plan = match[1].trim();
      console.log(`[AUTO-PARSE FALLBACK] Extracted insurance_provider: ${match[1].trim()}`);
      break;
    }
  }

  // Extract Group Number
  const groupPatterns = [
    /Group #:\s*([^\n|]+)/i,
    /group number:\s*([^\n|]+)/i,
    /group:\s*([^\n|]+)/i
  ];
  
  for (const pattern of groupPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      result.insurance_info.insurance_group_number = match[1].trim();
      result.insurance_info.insurance_id_number = match[1].trim();
      console.log(`[AUTO-PARSE FALLBACK] Extracted group_number: ${match[1].trim()}`);
      break;
    }
  }

  // Extract DOB
  const dobPatterns = [
    /Date of Birth:\s*([^\n|]+)/i,
    /DOB:\s*([^\n|]+)/i,
    /dob:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /birthdate:\s*([^\n|]+)/i
  ];
  
  for (const pattern of dobPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      result.contact_info.dob = match[1].trim();
      result.demographics.dob = match[1].trim();
      console.log(`[AUTO-PARSE FALLBACK] Extracted dob: ${match[1].trim()}`);
      break;
    }
  }

  // Extract Name
  const namePatterns = [
    /Name:\s*([^\n|]+)/i,
    /Patient Name:\s*([^\n|]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      result.contact_info.name = match[1].trim();
      console.log(`[AUTO-PARSE FALLBACK] Extracted name: ${match[1].trim()}`);
      break;
    }
  }

  // Extract Phone
  const phonePatterns = [
    /Phone:\s*([^\n|]+)/i,
    /phone number:\s*([^\n|]+)/i,
    /contact.*?phone:\s*([^\n|]+)/i
  ];
  
  for (const pattern of phonePatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      result.contact_info.phone = match[1].trim();
      console.log(`[AUTO-PARSE FALLBACK] Extracted phone: ${match[1].trim()}`);
      break;
    }
  }

  // Extract Email
  const emailMatch = intakeNotes.match(/Email:\s*([^\n|]+)/i) || intakeNotes.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    result.contact_info.email = emailMatch[1]?.trim() || emailMatch[0];
    console.log(`[AUTO-PARSE FALLBACK] Extracted email: ${result.contact_info.email}`);
  }

  // Extract Address
  const addressPatterns = [
    /Address:\s*([^\n|]+)/i,
    /Street Address:\s*([^\n|]+)/i
  ];
  
  for (const pattern of addressPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      result.contact_info.address = match[1].trim();
      console.log(`[AUTO-PARSE FALLBACK] Extracted address: ${match[1].trim()}`);
      break;
    }
  }

  // Extract PCP
  const pcpPatterns = [
    /Primary Care.*?:\s*([^\n|]+)/i,
    /PCP.*?:\s*([^\n|]+)/i,
    /physician.*?:\s*([^\n|]+)/i
  ];
  
  for (const pattern of pcpPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      // Try to extract phone from combined string
      const phoneMatch = value.match(/(\d{3}[.-]?\d{3}[.-]?\d{4})/);
      if (phoneMatch) {
        result.medical_info.pcp_phone = phoneMatch[1];
        result.medical_info.pcp_name = value.replace(phoneMatch[1], '').trim();
      } else {
        result.medical_info.pcp_name = value;
      }
      console.log(`[AUTO-PARSE FALLBACK] Extracted PCP: ${value}`);
      break;
    }
  }

  // Extract Pain Level
  const painPatterns = [
    /Pain Level:\s*(\d+)/i,
    /pain.*?:\s*(\d+)/i,
    /pain_level:\s*(\d+)/i
  ];
  
  for (const pattern of painPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      result.pathology_info.pain_level = match[1];
      console.log(`[AUTO-PARSE FALLBACK] Extracted pain_level: ${match[1]}`);
      break;
    }
  }

  // Extract Duration
  const durationPatterns = [
    /Duration:\s*([^\n|]+)/i,
    /how long.*?:\s*([^\n|]+)/i,
    /Over \d+ year/i
  ];
  
  for (const pattern of durationPatterns) {
    const match = intakeNotes.match(pattern);
    if (match) {
      result.pathology_info.duration = match[1]?.trim() || match[0];
      console.log(`[AUTO-PARSE FALLBACK] Extracted duration: ${result.pathology_info.duration}`);
      break;
    }
  }

  // Extract Symptoms
  const symptomsPatterns = [
    /Symptoms:\s*([^\n]+)/i,
    /symptoms.*?:\s*([^\n]+)/i
  ];
  
  for (const pattern of symptomsPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      result.pathology_info.symptoms = match[1].trim();
      console.log(`[AUTO-PARSE FALLBACK] Extracted symptoms: ${match[1].trim()}`);
      break;
    }
  }

  // Detect procedure type from keywords
  const upperNotes = intakeNotes.toUpperCase();
  if (upperNotes.includes('GAE') || upperNotes.includes('KNEE')) {
    result.pathology_info.procedure_type = 'GAE';
  } else if (upperNotes.includes('UFE') || upperNotes.includes('FIBROID')) {
    result.pathology_info.procedure_type = 'UFE';
  } else if (upperNotes.includes('PAE') || upperNotes.includes('PROSTATE')) {
    result.pathology_info.procedure_type = 'PAE';
  }

  console.log('[AUTO-PARSE FALLBACK] Regex parsing complete');
  return result;
}

// Post-AI enrichment: Always run regex extraction for critical fields
// This catches anything the AI parser might have missed (e.g., imaging_details)
function enrichWithCriticalFields(parsedData: any, intakeNotes: string): any {
  if (!intakeNotes) return parsedData;
  
  // Ensure medical_info exists
  if (!parsedData.medical_info) {
    parsedData.medical_info = {};
  }
  
  // Extract imaging details if not already populated
  if (!parsedData.medical_info.imaging_details) {
    const imagingPatterns = [
      /had_imaging_before:\s*([^\n|]+)/i,
      /have you had.*?imaging.*?:\s*([^\n|]+)/i,
      /had imaging before:\s*([^\n|]+)/i,
      /previous imaging:\s*([^\n|]+)/i,
      /imaging_done:\s*([^\n|]+)/i
    ];
    
    for (const pattern of imagingPatterns) {
      const match = intakeNotes.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        parsedData.medical_info.imaging_details = value;
        console.log(`[AUTO-PARSE ENRICH] Extracted imaging_details via regex: ${value}`);
        break;
      }
    }
  }
  
  // Extract PCP info if not already populated
  if (!parsedData.medical_info.pcp_name) {
    const pcpPatterns = [
      /Primary Care.*?:\s*([^\n|]+)/i,
      /PCP.*?:\s*([^\n|]+)/i,
      /physician.*?:\s*([^\n|]+)/i
    ];
    
    for (const pattern of pcpPatterns) {
      const match = intakeNotes.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        // Try to extract phone from combined string
        const phoneMatch = value.match(/(\d{3}[.-]?\d{3}[.-]?\d{4})/);
        if (phoneMatch) {
          parsedData.medical_info.pcp_phone = phoneMatch[1];
          parsedData.medical_info.pcp_name = value.replace(phoneMatch[1], '').trim();
        } else {
          parsedData.medical_info.pcp_name = value;
        }
        console.log(`[AUTO-PARSE ENRICH] Extracted PCP via regex: ${value}`);
        break;
      }
    }
  }
  
  return parsedData;
}

// Helper: Detect procedure type from a field key name (e.g., "GAE STEP 1 | Pain level" -> "GAE")
function detectProcedureFromFieldKey(key: string): string | null {
  const upperKey = key.toUpperCase();
  if (upperKey.includes('GAE') || (upperKey.includes('KNEE') && !upperKey.includes('UFE') && !upperKey.includes('PAE'))) {
    return 'GAE';
  }
  if (upperKey.includes('UFE') || upperKey.includes('FIBROID') || upperKey.includes('UTERINE')) {
    return 'UFE';
  }
  if (upperKey.includes('PAE') || upperKey.includes('PROSTATE')) {
    return 'PAE';
  }
  if (upperKey.includes('PFE') || upperKey.includes('PELVIC FLOOR')) {
    return 'PFE';
  }
  return null;
}

// Helper to extract structured data from GHL custom fields with procedure filtering
function extractDataFromGHLFields(contact: any, customFieldDefs: Record<string, string>, targetProcedure: string | null = null): any {
  const result = {
    insurance_info: { 
      insurance_provider: null as string | null, 
      insurance_plan: null as string | null, 
      insurance_id_number: null as string | null, 
      insurance_group_number: null as string | null,
      insurance_notes: null as string | null 
    },
    contact_info: { 
      name: null as string | null, 
      email: null as string | null, 
      phone: null as string | null, 
      address: null as string | null, 
      dob: null as string | null 
    },
    demographics: { 
      age: null as string | null, 
      gender: null as string | null, 
      dob: null as string | null 
    },
    pathology_info: { 
      procedure_type: targetProcedure as string | null, // Set procedure_type from calendar if known
      primary_complaint: null as string | null, 
      symptoms: null as string | null, 
      pain_level: null as string | null, 
      affected_area: null as string | null,
      affected_knee: null as string | null 
    },
    medical_info: { 
      medications: null as string | null, 
      allergies: null as string | null, 
      pcp_name: null as string | null,
      pcp_phone: null as string | null,
      urologist_name: null as string | null,
      urologist_phone: null as string | null,
      imaging_details: null as string | null,
      xray_details: null as string | null
    },
    insurance_card_url: null as string | null,
    hasCompleteStepData: false as boolean
  };

  // Extract root-level contact data
  if (contact.firstName || contact.lastName) {
    result.contact_info.name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
  }
  result.contact_info.email = contact.email || null;
  result.contact_info.phone = contact.phone || null;
  result.demographics.gender = contact.gender || null;

  // Build address from components
  if (contact.address1 || contact.city || contact.state) {
    const parts = [contact.address1, contact.city, contact.state, contact.postalCode].filter(Boolean);
    result.contact_info.address = parts.join(', ');
  }

  // Extract DOB
  if (contact.dateOfBirth) {
    result.contact_info.dob = contact.dateOfBirth;
    result.demographics.dob = contact.dateOfBirth;
  }

  // Process custom fields with procedure filtering
  const customFields = contact.customFields || [];
  let stepFieldCount = 0;
  
  for (const field of customFields) {
    const rawKey = customFieldDefs[field.id] || field.key || '';
    const key = rawKey.toLowerCase();
    const value = Array.isArray(field.field_value) ? field.field_value[0] : field.field_value;
    if (!value) continue;

    // Filter pathology fields by procedure if targetProcedure is set
    const fieldProcedure = detectProcedureFromFieldKey(rawKey);
    const isPathologyField = key.includes('step') || key.includes('pain') || key.includes('symptom') || 
                             key.includes('complaint') || key.includes('pae') || key.includes('ufe') || 
                             key.includes('gae') || key.includes('knee') || key.includes('prostate') ||
                             key.includes('fibroid') || key.includes('uterine') || key.includes('pelvic');
    
    // Skip pathology fields from different procedures
    if (targetProcedure && fieldProcedure && fieldProcedure !== targetProcedure && isPathologyField) {
      console.log(`[AUTO-PARSE GHL] Skipping field "${rawKey}" (procedure ${fieldProcedure}) - current appointment is ${targetProcedure}`);
      continue;
    }
    
    // Track STEP fields for the target procedure (indicates structured GHL data)
    if (rawKey.toUpperCase().includes('STEP') && (!fieldProcedure || fieldProcedure === targetProcedure)) {
      stepFieldCount++;
      // Extract structured data from STEP fields
      if (key.includes('pain') || key.includes('frequency') || key.includes('symptom')) {
        result.pathology_info.symptoms = result.pathology_info.symptoms 
          ? `${result.pathology_info.symptoms} | ${value}` 
          : value;
      }
      if (key.includes('level') && !result.pathology_info.pain_level) {
        const painMatch = value.match(/\d+/);
        if (painMatch) result.pathology_info.pain_level = painMatch[0];
      }
    }

    // Insurance fields
    if (key.includes('insurance') && key.includes('provider')) {
      result.insurance_info.insurance_provider = value;
    } else if (key.includes('insurance') && key.includes('plan')) {
      result.insurance_info.insurance_plan = value;
    } else if ((key.includes('member') && key.includes('id')) || key.includes('insurance_id')) {
      result.insurance_info.insurance_id_number = value;
    } else if (key.includes('group') || key.includes('grp')) {
      result.insurance_info.insurance_group_number = value;
    } else if (key.includes('insurance') && key.includes('note')) {
      result.insurance_info.insurance_notes = value;
    }
    // Insurance card URL
    else if ((key.includes('insurance') && key.includes('card')) || key.includes('upload')) {
      console.log(`[AUTO-PARSE GHL] Found potential insurance card field "${key}":`, typeof value, value?.substring?.(0, 100) || value);
      const extractedUrl = extractUrlFromJsonOrString(value);
      console.log(`[AUTO-PARSE GHL] Extracted URL:`, extractedUrl);
      if (extractedUrl) {
        result.insurance_card_url = extractedUrl;
      }
    }
    // Pathology fields - expanded for Vivid Vascular PAE/UFE/GAE patterns
    else if (key.includes('complaint') || key.includes('reason') || key.includes('concern')) {
      result.pathology_info.primary_complaint = value;
    } else if (key.includes('symptom')) {
      result.pathology_info.symptoms = value;
    } else if (key.includes('pain') && key.includes('level')) {
      result.pathology_info.pain_level = value;
    } else if (key.includes('affected') || key.includes('area') || key.includes('location')) {
      result.pathology_info.affected_area = value;
      // Check for knee side in the value
      const lowerValue = value.toLowerCase();
      if (lowerValue.includes('knee')) {
        if (lowerValue.includes('both') || lowerValue.includes('bilateral')) {
          result.pathology_info.affected_knee = 'Both';
        } else if (lowerValue.includes('left')) {
          result.pathology_info.affected_knee = 'Left';
        } else if (lowerValue.includes('right')) {
          result.pathology_info.affected_knee = 'Right';
        }
      }
    }
    // Specific knee side field
    else if (key.includes('knee') && (key.includes('which') || key.includes('affected') || key.includes('side'))) {
      const lowerValue = value.toLowerCase();
      if (lowerValue.includes('both') || lowerValue.includes('bilateral')) {
        result.pathology_info.affected_knee = 'Both';
      } else if (lowerValue.includes('left')) {
        result.pathology_info.affected_knee = 'Left';
      } else if (lowerValue.includes('right')) {
        result.pathology_info.affected_knee = 'Right';
      }
    }
    // Procedure/treatment preference fields (Vivid Vascular patterns)
    else if (key.includes('prefer') || key.includes('non-surgical') || key.includes('nonsurgical') || 
             key.includes('treatment') || key.includes('procedure') || key.includes('surgical')) {
      // Extract procedure type from key if present
      const procedureMatch = key.match(/\b(pae|ufe|gae)\b/i);
      if (procedureMatch) {
        result.pathology_info.primary_complaint = `${procedureMatch[1].toUpperCase()} Consultation`;
      }
      // Store treatment preference as symptom/notes
      if (result.pathology_info.symptoms) {
        result.pathology_info.symptoms += ` | ${value}`;
      } else {
        result.pathology_info.symptoms = value;
      }
    }
    // PAE/UFE/GAE specific fields
    else if (key.includes('pae') || key.includes('prostate')) {
      result.pathology_info.primary_complaint = 'PAE Consultation';
      result.pathology_info.affected_area = 'Prostate';
    } else if (key.includes('ufe') || key.includes('fibroid') || key.includes('uterine')) {
      result.pathology_info.primary_complaint = 'UFE Consultation';
      result.pathology_info.affected_area = 'Uterus';
    } else if (key.includes('gae') || key.includes('gastric') || key.includes('artery') && key.includes('embolization')) {
      result.pathology_info.primary_complaint = 'GAE Consultation';
      result.pathology_info.affected_area = 'Gastric';
    }
    // Medical fields
    else if (key.includes('medication')) {
      result.medical_info.medications = value;
    } else if (key.includes('allerg')) {
      result.medical_info.allergies = value;
    } else if (key.includes('pcp') || key.includes('doctor') || key.includes('physician') || key.includes('primary care')) {
      // PCP/Primary Care fields - extract name and phone from combined values like "Jones 214-555-5555"
      const value_str = String(value);
      
      // Try to extract phone number (XXX-XXX-XXXX, (XXX) XXX-XXXX, or 10+ digits)
      const phonePatterns = [
        /(\d{3}-\d{3}-\d{4})/,           // 214-555-5555
        /(\(\d{3}\)\s*\d{3}-\d{4})/,     // (214) 555-5555
        /(\d{10,})/                       // 2145555555
      ];
      
      let phoneMatch = null;
      for (const pattern of phonePatterns) {
        phoneMatch = value_str.match(pattern);
        if (phoneMatch) break;
      }
      
      if (phoneMatch) {
        const phone = phoneMatch[1];
        const name = value_str.replace(phone, '').replace(/^\s*[-,]\s*|\s*[-,]\s*$/g, '').trim();
        result.medical_info.pcp_name = name || value_str;
        result.medical_info.pcp_phone = phone;
        console.log(`[AUTO-PARSE GHL] Extracted PCP from "${key}": name="${result.medical_info.pcp_name}", phone="${phone}"`);
      } else {
        result.medical_info.pcp_name = value_str;
        console.log(`[AUTO-PARSE GHL] Extracted PCP name from "${key}": "${value_str}" (no phone found)`);
      }
    }
    // Urologist fields
    else if (key.includes('urologist')) {
      // Try to extract name and phone from value like "dr pen 6272893382"
      const value_str = String(value);
      const phoneMatch = value_str.match(/(\d{10,})/);
      if (phoneMatch) {
        const phone = phoneMatch[1];
        const name = value_str.replace(phone, '').trim();
        result.medical_info.urologist_name = name || value_str;
        result.medical_info.urologist_phone = phone;
      } else {
        result.medical_info.urologist_name = value_str;
      }
    }
    // Imaging/X-ray fields - look for "Had Imaging Before" and similar fields
    else if (key.includes('imaging') || key.includes('x-ray') || key.includes('xray') || 
             key.includes('had imaging') || key.includes('mri') || key.includes('ct scan') ||
             key.includes('have you had')) {
      const lowerKey = key.toLowerCase();
      const valueStr = String(value);
      
      // Check if this is the "Have you had a knee X-ray or MRI or CT?" field from GAE STEP
      if (lowerKey.includes('have you had') && (lowerKey.includes('x-ray') || lowerKey.includes('mri') || lowerKey.includes('ct'))) {
        // Handle checkbox format "☑️ YES" or plain "YES"/"NO"
        const cleanValue = valueStr.replace(/^☑️\s*/, '').trim();
        
        // If value has details beyond YES/NO, store as imaging_details
        if (cleanValue.toLowerCase() !== 'yes' && cleanValue.toLowerCase() !== 'no') {
          result.medical_info.imaging_details = valueStr;
        } else if (cleanValue.toLowerCase() === 'yes' && !result.medical_info.imaging_details) {
          // For simple YES answers, store a descriptive placeholder
          result.medical_info.imaging_details = 'Patient has had previous imaging';
        }
        console.log(`[AUTO-PARSE GHL] Found imaging STEP field "${key}": ${valueStr}`);
      } else if (lowerKey.includes('x-ray') || lowerKey.includes('xray')) {
        result.medical_info.xray_details = valueStr;
      } else if (lowerKey.includes('had imaging') || lowerKey.includes('imaging before')) {
        // Specific "Had Imaging Before?" field with details
        result.medical_info.imaging_details = valueStr;
        console.log(`[AUTO-PARSE GHL] Extracted 'Had Imaging Before' field: ${valueStr}`);
      } else {
        result.medical_info.imaging_details = valueStr;
      }
      console.log(`[AUTO-PARSE GHL] Extracted imaging field "${key}": ${valueStr}`);
    }
    // DOB from custom field
    else if (key.includes('dob') || (key.includes('date') && key.includes('birth'))) {
      result.contact_info.dob = value;
      result.demographics.dob = value;
    }
    // Catch-all for uncategorized procedure-related fields
    else if (key.includes('consultation') || key.includes('appointment') || key.includes('service')) {
      if (!result.pathology_info.primary_complaint) {
        result.pathology_info.primary_complaint = value;
      }
    }
  }
  
  // Mark as having complete step data if we found structured STEP fields for the target procedure
  if (stepFieldCount >= 2) {
    result.hasCompleteStepData = true;
    console.log(`[AUTO-PARSE GHL] Found ${stepFieldCount} STEP fields for ${targetProcedure || 'unknown'} procedure - will prefer GHL data over AI`);
  }

  console.log('[AUTO-PARSE GHL] Extracted data from GHL:', {
    hasInsurance: !!result.insurance_info.insurance_provider,
    hasContact: !!result.contact_info.name,
    hasDOB: !!result.demographics.dob,
    hasInsuranceCard: !!result.insurance_card_url,
    hasCompleteStepData: result.hasCompleteStepData,
    targetProcedure,
    stepFieldCount
  });

  return result;
}

// Helper to merge objects, only overwriting values if overlay value is NOT null/undefined
function mergeWithNonNull(base: any, overlay: any): any {
  if (!overlay) return base || {};
  if (!base) return overlay;
  
  const result = { ...base };
  for (const key in overlay) {
    if (overlay[key] !== null && overlay[key] !== undefined && overlay[key] !== '') {
      result[key] = overlay[key];
    }
  }
  return result;
}

// Calculate age from DOB string
function calculateAgeFromDob(dobString: string | null | undefined): number | null {
  if (!dobString) return null;
  
  try {
    const dob = new Date(dobString);
    const today = new Date();
    
    // Check if date is valid and not in the future
    if (isNaN(dob.getTime()) || dob > today) return null;
    
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age >= 0 ? age : null;
  } catch (e) {
    return null;
  }
}

// Helper: Detect procedure type from calendar name
function detectProcedureFromCalendar(calendarName: string | null): string | null {
  if (!calendarName) return null;
  const name = calendarName.toLowerCase();
  
  if (name.includes('ufe') || name.includes('fibroid') || name.includes('uterine')) {
    return 'UFE';
  }
  if (name.includes('pae') || name.includes('prostate')) {
    return 'PAE';
  }
  if (name.includes('gae') || name.includes('knee') || name.includes('osteoarthritis')) {
    return 'GAE';
  }
  if (name.includes('pfe') || name.includes('pelvis') || name.includes('pelvic floor')) {
    return 'PFE';
  }
  return null;
}

// Normalize DOB string to YYYY-MM-DD format or return null
function normalizeDob(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;

  // Strip ordinal suffixes (1st, 2nd, 3rd, 4th) and commas
  const cleaned = raw
    .replace(/(\d+)(st|nd|rd|th)/gi, "$1")
    .replace(/,/g, "")
    .trim();

  // Try parsing with various formats
  const formats = [
    // Month name formats
    /^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/, // Sep 20 1954
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/, // 20 Sep 1954
    // Numeric formats
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // 9/20/1954 or 09/20/1954
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // 1954-09-20
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      try {
        let year: number, month: number, day: number;

        if (format.source.includes("[A-Za-z]")) {
          // Month name format
          const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
          const monthStr = match[1].toLowerCase().substring(0, 3);
          const monthIdx = monthNames.indexOf(monthStr);

          if (monthIdx === -1) continue;

          if (match[1].match(/[A-Za-z]/)) {
            // Format: Month Day Year
            month = monthIdx + 1;
            day = parseInt(match[2]);
            year = parseInt(match[3]);
          } else {
            // Format: Day Month Year
            day = parseInt(match[1]);
            const monthStr2 = match[2].toLowerCase().substring(0, 3);
            const monthIdx2 = monthNames.indexOf(monthStr2);
            if (monthIdx2 === -1) continue;
            month = monthIdx2 + 1;
            year = parseInt(match[3]);
          }
        } else if (match[1].length === 4) {
          // YYYY-MM-DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          // M/D/YYYY format
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        }

        // Validate date components
        if (year < 1900 || year > 2100) continue;
        if (month < 1 || month > 12) continue;
        if (day < 1 || day > 31) continue;

        // Create date and format as YYYY-MM-DD
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, "0");
          const dd = String(date.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        }
      } catch (e) {
        continue;
      }
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for records that need parsing - prioritize recent appointments
    const { data: appointmentsNeedingParsing, error: apptError } = await supabase
      .from("all_appointments")
      .select("id, patient_intake_notes, lead_name, project_name, created_at, dob, parsed_demographics, parsed_contact_info, ghl_id, ghl_appointment_id, calendar_name, date_of_appointment")
      .is("parsing_completed_at", null)
      .not("patient_intake_notes", "is", null)
      .neq("patient_intake_notes", "")
      .order("created_at", { ascending: false })
      .limit(25); // Increased batch size for better throughput

    if (apptError) {
      console.error("[AUTO-PARSE] Error fetching appointments:", apptError);
      console.error("[AUTO-PARSE] Appointment fetch error details:", JSON.stringify(apptError));
    }

    const { data: leadsNeedingParsing, error: leadError } = await supabase
      .from("new_leads")
      .select("id, patient_intake_notes, lead_name, project_name, created_at")
      .is("parsing_completed_at", null)
      .not("patient_intake_notes", "is", null)
      .neq("patient_intake_notes", "")
      .order("created_at", { ascending: false })
      .limit(25); // Increased batch size for better throughput

    if (leadError) {
      console.error("[AUTO-PARSE] Error fetching leads:", leadError);
      console.error("[AUTO-PARSE] Lead fetch error details:", JSON.stringify(leadError));
    }

    const allRecordsToProcess = [
      ...(appointmentsNeedingParsing || []).map((r) => ({ ...r, table: "all_appointments" })),
      ...(leadsNeedingParsing || []).map((r) => ({ ...r, table: "new_leads" })),
    ];

    console.log(`[AUTO-PARSE] Found ${allRecordsToProcess.length} records needing parsing (${appointmentsNeedingParsing?.length || 0} appointments, ${leadsNeedingParsing?.length || 0} leads)`);

    let processed = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (const record of allRecordsToProcess) {
      const recordIdentifier = `${record.table}:${record.id}:${record.lead_name}:${record.project_name}`;
      try {
        console.log(`[AUTO-PARSE] Processing ${recordIdentifier}`);
        
        let ghlData: any = null;
        let calendarProcedure: string | null = null;
        
        // Detect procedure from calendar name early
        if (record.table === 'all_appointments' && record.calendar_name) {
          calendarProcedure = detectProcedureFromCalendar(record.calendar_name);
          if (calendarProcedure) {
            console.log(`[AUTO-PARSE] Detected ${calendarProcedure} procedure from calendar: ${record.calendar_name}`);
          }
        }
        
        // If appointment has ghl_id, try to fetch GHL custom fields
        if (record.table === 'all_appointments' && record.ghl_id) {
          console.log(`[AUTO-PARSE] Appointment has ghl_id: ${record.ghl_id}, fetching GHL credentials...`);
          
          // Get project's GHL credentials
          const { data: projectData } = await supabase
            .from('projects')
            .select('ghl_api_key, ghl_location_id')
            .eq('project_name', record.project_name)
            .single();
          
          if (projectData?.ghl_api_key && projectData?.ghl_location_id) {
            console.log(`[AUTO-PARSE] Found GHL credentials for ${record.project_name}, fetching custom fields...`);
            const ghlResult = await fetchGHLCustomFields(
              record.ghl_id,
              record.ghl_appointment_id || null,
              projectData.ghl_api_key, 
              projectData.ghl_location_id
            );
            
            if (ghlResult) {
              // Pass calendarProcedure to filter GHL fields by current procedure
              ghlData = extractDataFromGHLFields(ghlResult.contact, ghlResult.customFieldDefs, calendarProcedure);
              console.log(`[AUTO-PARSE] ✓ GHL data fetched for ${record.lead_name} (procedure filter: ${calendarProcedure || 'none'})`);
              
              // Update ghl_id in DB if it was corrected from appointment lookup
              if (ghlResult.resolvedContactId && ghlResult.resolvedContactId !== record.ghl_id) {
                await supabase
                  .from('all_appointments')
                  .update({ ghl_id: ghlResult.resolvedContactId })
                  .eq('id', record.id);
                console.log(`[AUTO-PARSE] Updated ghl_id from ${record.ghl_id} to ${ghlResult.resolvedContactId}`);
              }
            } else {
              console.log(`[AUTO-PARSE] ⚠ Failed to fetch GHL data for ${record.lead_name}`);
            }
          } else {
            console.log(`[AUTO-PARSE] ⚠ No GHL credentials found for project ${record.project_name}`);
          }
        }
        
        const systemPrompt = `You are a medical intake data parser. Your task is to extract and categorize information from patient intake notes into specific sections.

Parse the following patient intake notes and return a JSON object with these exact fields:
{
  "insurance_info": {
    "insurance_provider": "string or null",
    "insurance_plan": "string or null",
    "insurance_id_number": "string or null",
    "insurance_group_number": "string or null",
    "insurance_notes": "string or null - Any additional insurance notes, secondary insurance info, VA coverage, Medicaid/Medicare notes, or other insurance-related comments documented by the caller"
  },
  "contact_info": {
    "name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null",
    "dob": "string or null"
  },
  "demographics": {
    "age": "string or null",
    "gender": "string or null",
    "dob": "string or null"
  },
  "pathology_info": {
    "procedure_type": "string or null - The pathology type (e.g., GAE, TKR, etc.). This is NOT the patient complaint.",
    "primary_complaint": "string or null - The patient's chief complaint (e.g., 'knee pain', 'hip pain'), NOT the pathology type.",
    "symptoms": "string or null",
    "pain_level": "string or null",
    "affected_area": "string or null",
    "affected_knee": "string or null - Which knee is affected: 'Left', 'Right', or 'Both'. Extract from any mention of specific knee side, bilateral, or left/right knee references.",
    "duration": "string or null",
    "previous_treatments": "string or null",
    "oa_tkr_diagnosed": "string or null (YES/NO)",
    "age_range": "string or null",
    "trauma_related_onset": "string or null (YES/NO)",
    "imaging_done": "string or null (YES/NO)",
    "imaging_type": "string or null (X-ray, MRI, CT scan, etc.)",
    "diagnosis": "string or null",
    "treatment": "string or null",
    "other_notes": "string or null"
  },
  "medical_info": {
    "pcp_name": "string or null",
    "pcp_phone": "string or null",
    "pcp_address": "string or null",
    "urologist_name": "string or null - The urologist's name if mentioned",
    "urologist_phone": "string or null - The urologist's phone number if mentioned",
    "imaging_details": "string or null",
    "xray_details": "string or null",
    "medications": "string or null",
    "allergies": "string or null"
  }
}

IMPORTANT: Return ONLY the JSON object, no other text. If information is not found, use null for that field.`;

        // Build procedure context for AI prompt (use already-detected calendarProcedure)
        let procedureContext = '';
        if (calendarProcedure) {
            procedureContext = `
IMPORTANT CONTEXT: This patient's current appointment is for a ${calendarProcedure} consultation (calendar: "${record.calendar_name}").
If the notes contain information for MULTIPLE procedures (e.g., both GAE and UFE data), 
you MUST extract and prioritize the ${calendarProcedure}-specific pathology data.

${calendarProcedure === 'UFE' ? 'UFE (Uterine Fibroid Embolization) focuses on: pelvic pain, heavy periods, menstrual bleeding issues, urinary symptoms, pain during intercourse, fibroid-related symptoms. Set procedure_type to "UFE".' : ''}
${calendarProcedure === 'PAE' ? 'PAE (Prostatic Artery Embolization) focuses on: urinary frequency, weak urinary stream, incomplete bladder emptying, nocturia, prostate-related symptoms. Set procedure_type to "PAE".' : ''}
${calendarProcedure === 'GAE' ? 'GAE (Genicular Artery Embolization) focuses on: knee pain, osteoarthritis, joint stiffness, swelling, joint instability, knee-related symptoms. Set procedure_type to "GAE".' : ''}
${calendarProcedure === 'PFE' ? 'PFE (Pelvic Floor Embolization) focuses on: pelvic pain, pelvic floor dysfunction symptoms. Set procedure_type to "PFE".' : ''}

IGNORE any intake data from prior consultations for different procedures. Focus on ${calendarProcedure} data only.
`;
        }

        const userPrompt = `${procedureContext}Patient Intake Notes:\n\n${record.patient_intake_notes}`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAIApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 1000,
          }),
        });

        let parsedData;
        let usedFallback = false;

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[AUTO-PARSE] OpenAI API error for ${recordIdentifier}:`, response.status, errorText);
          
          // Check for rate limit error (429) - use fallback regex parsing
          if (response.status === 429) {
            console.log(`[AUTO-PARSE] OpenAI rate limited (429), using regex fallback for ${recordIdentifier}`);
            parsedData = fallbackRegexParsing(record.patient_intake_notes);
            usedFallback = true;
          } else {
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
          }
        }
        
        if (!usedFallback) {
          const aiResponse = await response.json();
          const parsedContent = aiResponse.choices[0]?.message?.content;

          if (!parsedContent) {
            console.error(`[AUTO-PARSE] No content returned for ${recordIdentifier}`);
            // Fall back to regex parsing instead of throwing
            console.log(`[AUTO-PARSE] Using regex fallback due to empty AI response for ${recordIdentifier}`);
            parsedData = fallbackRegexParsing(record.patient_intake_notes);
            usedFallback = true;
          } else {
            // Parse the JSON response
            try {
              parsedData = JSON.parse(parsedContent);
            } catch (parseError) {
              console.error(`[AUTO-PARSE] Failed to parse AI response for ${recordIdentifier}:`, parsedContent);
              // Fall back to regex parsing instead of throwing
              console.log(`[AUTO-PARSE] Using regex fallback due to invalid JSON for ${recordIdentifier}`);
              parsedData = fallbackRegexParsing(record.patient_intake_notes);
              usedFallback = true;
            }
          }
        }
        
        if (usedFallback) {
          console.log(`[AUTO-PARSE] ✓ Fallback parsing completed for ${recordIdentifier}`);
        }

        // Merge GHL-fetched data with AI-parsed data
        // GHL data has already been filtered by procedure, so it takes priority
        if (ghlData) {
          console.log('[AUTO-PARSE] Merging GHL data with AI-parsed data (non-null only)...');
          parsedData.insurance_info = mergeWithNonNull(parsedData.insurance_info, ghlData.insurance_info);
          parsedData.contact_info = mergeWithNonNull(parsedData.contact_info, ghlData.contact_info);
          parsedData.demographics = mergeWithNonNull(parsedData.demographics, ghlData.demographics);
          
          // For pathology: GHL data is already filtered by procedure, so merge with priority
          // If GHL has complete STEP data, prefer it; otherwise merge AI on top of GHL
          if (ghlData.hasCompleteStepData) {
            console.log(`[AUTO-PARSE] Using GHL structured STEP data for ${calendarProcedure} (AI fallback not needed for pathology)`);
            parsedData.pathology_info = mergeWithNonNull(ghlData.pathology_info, parsedData.pathology_info);
          } else {
            // AI parsed data takes priority, GHL fills gaps
            parsedData.pathology_info = mergeWithNonNull(parsedData.pathology_info, ghlData.pathology_info);
          }
          
          parsedData.medical_info = mergeWithNonNull(parsedData.medical_info, ghlData.medical_info);
          
          // Ensure procedure_type is set from calendar if known
          if (calendarProcedure && parsedData.pathology_info) {
            parsedData.pathology_info.procedure_type = calendarProcedure;
          }
        }

        // Post-AI enrichment: Always run regex extraction for critical fields
        // This catches anything the AI parser might have missed
        parsedData = enrichWithCriticalFields(parsedData, record.patient_intake_notes);

        // Extract urologist info from raw intake notes (fallback if not found in GHL or AI)
        const urologistFromText = extractUrologistFromText(record.patient_intake_notes);
        if (!parsedData.medical_info) {
          parsedData.medical_info = {};
        }
        if (urologistFromText.name && !parsedData.medical_info.urologist_name) {
          parsedData.medical_info.urologist_name = urologistFromText.name;
        }
        if (urologistFromText.phone && !parsedData.medical_info.urologist_phone) {
          parsedData.medical_info.urologist_phone = urologistFromText.phone;
        }

        // Normalize DOB to proper format
        const dobIso = normalizeDob(parsedData.contact_info?.dob);

        // Build update data based on table
        const updateData: any = {
          parsing_completed_at: new Date().toISOString(),
        };

        if (record.table === "all_appointments") {
          // Get existing data for merging
          const existingDob = record.dob;
          const existingParsedDemo = record.parsed_demographics || {};
          const existingParsedContact = record.parsed_contact_info || {};
          
          // Determine final DOB (prefer existing DB column, then AI-parsed)
          const finalDob = existingDob || dobIso || parsedData.contact_info?.dob || parsedData.demographics?.dob;
          
          // Calculate age from final DOB if age not in parsed data
          let finalAge = parsedData.demographics?.age;
          if (!finalAge && finalDob) {
            const calculatedAge = calculateAgeFromDob(finalDob);
            if (calculatedAge !== null) {
              finalAge = calculatedAge.toString();
            }
          }
          
          // Merge demographics: preserve existing, add AI-parsed, ensure DOB and age
          updateData.parsed_demographics = {
            ...existingParsedDemo,
            ...parsedData.demographics,
            dob: finalDob,
            age: finalAge || existingParsedDemo.age
          };
          
          // Merge contact info: preserve existing, add AI-parsed
          updateData.parsed_contact_info = {
            ...existingParsedContact,
            ...parsedData.contact_info,
            dob: finalDob // Also ensure DOB in contact_info
          };
          
          // For appointments: include parsed_* JSON fields
          updateData.parsed_insurance_info = parsedData.insurance_info;
          updateData.parsed_pathology_info = parsedData.pathology_info;
          updateData.parsed_medical_info = parsedData.medical_info;

          // Sync DOB to main column if we have one
          if (finalDob) {
            updateData.dob = finalDob;
          }

          // Sync insurance info to main columns
          if (parsedData.insurance_info?.insurance_provider) {
            updateData.detected_insurance_provider = parsedData.insurance_info.insurance_provider;
          }
          if (parsedData.insurance_info?.insurance_plan) {
            updateData.detected_insurance_plan = parsedData.insurance_info.insurance_plan;
          }
          if (parsedData.insurance_info?.insurance_id_number) {
            updateData.detected_insurance_id = parsedData.insurance_info.insurance_id_number;
          }
          
          // Update insurance_id_link with fallback chain:
          // 1. GHL custom field URL (highest priority)
          // 2. Extract from patient_intake_notes text (fallback)
          if (ghlData?.insurance_card_url) {
            updateData.insurance_id_link = ghlData.insurance_card_url;
            console.log(`[AUTO-PARSE] Setting insurance_id_link from GHL: ${ghlData.insurance_card_url}`);
          } else {
            // Fallback: extract from intake notes text
            const extractedUrl = extractInsuranceUrlFromText(record.patient_intake_notes);
            if (extractedUrl) {
              updateData.insurance_id_link = extractedUrl;
              console.log(`[AUTO-PARSE] Setting insurance_id_link from intake notes: ${extractedUrl}`);
            }
          }
        } else if (record.table === "new_leads") {
          // For leads: DO NOT include parsed_* fields (they don't exist)
          // Only sync to main columns
          if (dobIso) {
            updateData.dob = dobIso;
          }

          if (parsedData.insurance_info?.insurance_provider) {
            updateData.insurance_provider = parsedData.insurance_info.insurance_provider;
          }
          if (parsedData.insurance_info?.insurance_plan) {
            updateData.insurance_plan = parsedData.insurance_info.insurance_plan;
          }
          if (parsedData.insurance_info?.insurance_id_number) {
            updateData.insurance_id = parsedData.insurance_info.insurance_id_number;
          }
          if (parsedData.insurance_info?.insurance_group_number) {
            updateData.group_number = parsedData.insurance_info.insurance_group_number;
          }
        }

        const { error: updateError } = await supabase.from(record.table).update(updateData).eq("id", record.id);

        if (updateError) {
          console.error(`[AUTO-PARSE] Failed to update ${recordIdentifier}:`, updateError);
          console.error(`[AUTO-PARSE] Update error details:`, JSON.stringify(updateError));
          errorDetails.push({
            record: recordIdentifier,
            errorType: 'database_update',
            error: updateError.message || String(updateError),
            timestamp: new Date().toISOString()
          });
          errors++;
        } else {
          console.log(`[AUTO-PARSE] ✓ Successfully parsed and updated ${recordIdentifier}`);
          processed++;
        }

        // Removed delay for better throughput
      } catch (error) {
        console.error(`[AUTO-PARSE] Error processing ${recordIdentifier}:`, error);
        console.error(`[AUTO-PARSE] Full error details:`, error.message, error.stack);
        errorDetails.push({
          record: recordIdentifier,
          errorType: error.name || 'unknown',
          error: error.message || String(error),
          timestamp: new Date().toISOString()
        });
        errors++;
      }
    }

    console.log(`[AUTO-PARSE] Batch complete: ${processed} processed, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        total: allRecordsToProcess.length,
        errorDetails: errors > 0 ? errorDetails : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[AUTO-PARSE] Critical function error:", error);
    console.error("[AUTO-PARSE] Error stack:", error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error),
        errorType: error.name || 'unknown',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
