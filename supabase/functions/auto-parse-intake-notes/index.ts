import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

// Extract PCP name and/or phone from raw intake notes. Handles:
//  - Combined line: "Primary Care Doctor's Name and Phone: Dr Jones 214-555-5555"
//  - Split lines:   "Primary Care Doctor's Name: Dr Jones"
//                   "Primary Care Doctor's Phone Number: 214-555-5555"
// Never mistakes a phone-labeled line for a name.
function extractPcpNameAndPhone(intakeNotes: string): { name: string | null; phone: string | null } {
  const result: { name: string | null; phone: string | null } = { name: null, phone: null };
  if (!intakeNotes) return result;

  const PHONE_RE = /(\(?\d{3}\)?[.\-\s]?\d{3}[.\-\s]?\d{4})/;
  const isBad = (v: string) => !v || /^(none|n\/a|unknown|-|--)$/i.test(v.trim());

  // 1) Name-specific labels first.
  const nameLine = intakeNotes.match(/(?:Primary Care|PCP)[^:\n]*\bName\b[^:\n]*:\s*([^\n|]+)/i);
  if (nameLine && nameLine[1]) {
    const v = nameLine[1].trim().replace(/[,\-\s]+$/, '');
    if (!isBad(v)) {
      const pm = v.match(PHONE_RE);
      if (pm) {
        result.phone = pm[1];
        const stripped = v.replace(pm[1], '').replace(/[,\-\s]+$/, '').trim();
        if (stripped && !isBad(stripped)) result.name = stripped;
      } else {
        result.name = v;
      }
    }
  }

  // 2) Phone-specific labels.
  if (!result.phone) {
    const phoneLine = intakeNotes.match(/(?:Primary Care|PCP)[^:\n]*(?:Phone|Number|Tel)[^:\n]*:\s*([^\n|]+)/i);
    if (phoneLine && phoneLine[1]) {
      const v = phoneLine[1].trim();
      if (!isBad(v)) {
        const pm = v.match(PHONE_RE);
        result.phone = pm ? pm[1] : v;
      }
    }
  }

  // 3) Generic fallback for a combined "Primary Care …: <name and/or phone>" line,
  //    but SKIP any line whose label is phone-specific (already handled) so we don't
  //    accidentally treat digits as a name.
  if (!result.name) {
    const lineRe = /^(?:[ \t]*)([^\n:]*(?:Primary Care|PCP|physician)[^\n:]*):\s*([^\n|]+)$/gim;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(intakeNotes)) !== null) {
      const label = m[1] || '';
      const value = (m[2] || '').trim();
      if (isBad(value)) continue;
      if (/\b(phone|number|tel)\b/i.test(label)) continue; // handled above
      if (/\bname\b/i.test(label)) { /* already tried */ continue; }
      const pm = value.match(PHONE_RE);
      if (pm) {
        if (!result.phone) result.phone = pm[1];
        const stripped = value.replace(pm[1], '').replace(/[,\-\s]+$/, '').trim();
        if (stripped && !isBad(stripped)) { result.name = stripped; break; }
      } else {
        result.name = value;
        break;
      }
    }
  }

  return result;
}


// Reject conversational/status text masquerading as group number
function isInvalidGroupNumber(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = String(v).trim();
  if (s.length === 0) return false;
  if (s.length > 40) return true;
  if (/insurance type:|appointment status:|appointment details:|\bscheduled\b|\bnot scheduled\b|\bunknown\b/i.test(s)) return true;
  if (/^missing\b/i.test(s)) return true;
  return false;
}

// Reject leaked GHL "Patient Intake Summary" blob fragments masquerading as
// insurance provider/plan/id values (e.g. "Insurance Phone:   Insurance ID: OOP  ...").
function isInvalidInsuranceValue(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = String(v).trim();
  if (!s) return false;
  if (s.length > 80) return true;
  // Reject stub values (e.g. "B", "A", "X") — usually a placeholder from a
  // half-filled intake. NOTE: this check is appropriate for provider/plan
  // names but is intentionally NOT applied to insurance_id_number, which can
  // legitimately be all-numeric (e.g. "350244934014").
  if (s.replace(/[^A-Za-z]/g, '').length < 3) return true;


  if (/(GAE Info|PFE Info|UFE Info|PAE Info|HAE Info|PAD Info|FSE Info|TAE Info)/i.test(s)) return true;
  if (/No fields found in your shared list/i.test(s)) return true;
  if (/(Insurance Phone:|Group Number:|Upload Card:|Insurance Notes:|Insurance Plan:|Insurance ID:)/i.test(s)) return true;
  return false;
}

// Strip pathology STEP question lines from prior services when the current
// procedure differs. Patients sometimes re-opt-in for a different service
// (e.g. GAE → UFE) and the prior funnel answers linger on the GHL contact.
// We keep only STEP lines tagged with the current procedure (or untagged lines).
function stripStaleStepLines(notes: string | null | undefined, currentProc: string | null | undefined): string {
  if (!notes) return notes || '';
  if (!currentProc) return notes;
  const proc = String(currentProc).toUpperCase();
  const stepRe = /^\s*(GAE|UFE|PAE|HAE|PAD|FSE|TAE|PFE|NEUROPATHY)\s+STEP\s+\d+\s*\|/i;
  const lines = notes.split(/\r?\n/);
  let stripped = 0;
  const kept = lines.filter((line) => {
    const m = line.match(stepRe);
    if (!m) return true;
    const linePrefix = m[1].toUpperCase();
    // Neuropathy is its own service (The Painless Center). Keep STEP lines
    // only when the prefix matches the current procedure exactly.
    const matchesCurrent = linePrefix === proc;
    if (!matchesCurrent) stripped++;
    return matchesCurrent;
  });
  if (stripped > 0) {
    console.log(`[AUTO-PARSE STEP-STRIP] Removed ${stripped} stale STEP line(s) for current procedure ${proc}`);
  }
  return kept.join('\n');
}

// Extract a "Field Name: value" entry from intake notes, including any
// continuation lines that follow (GHL stores multi-line answers as literal
// newlines inside a single field value). Stops at a blank line, the next
// "Field Name:" line, or a section header ("=== ", "---").
function extractMultiLineFieldValue(notes: string, fieldRegex: RegExp): string | null {
  if (!notes) return null;
  const lines = notes.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(fieldRegex);
    if (m && m[1] !== undefined) {
      const parts = [m[1].trim()];
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (!next.trim()) break;
        // Next "Key:" / "Key ?:" line — typical GHL formatted field
        if (/^\s{0,6}[A-Za-z][A-Za-z0-9 _'/&\-?().,]*\s*:/.test(next)) break;
        // Section headers / separators
        if (/^=== /.test(next) || /^---/.test(next) || /^\*\*/.test(next)) break;
        parts.push(next.trim());
      }
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    }
  }
  return null;
}


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
  return extractFrontBackFromJsonOrString(value).front;
}

// Helper: Extract front + back URLs from GHL upload JSON blob.
// GHL stores multiple uploads as {"uuid": {"url":"...", "meta":{"originalname":"...front.jpg"}}}.
// We disambiguate by originalname keywords ("front"/"back"). Anything unlabeled fills front, then back.
function extractFrontBackFromJsonOrString(value: any): { front: string | null; back: string | null } {
  const out = { front: null as string | null, back: null as string | null };
  if (!value) return out;

  let parsed: any = value;
  if (typeof value === 'string') {
    if (value.startsWith('http')) {
      out.front = value;
      return out;
    }
    if (value.startsWith('{')) {
      try { parsed = JSON.parse(value); } catch { return out; }
    } else {
      return out;
    }
  }

  if (typeof parsed !== 'object' || parsed === null) return out;

  const entries = Object.values(parsed) as any[];
  const unlabeled: string[] = [];
  for (const e of entries) {
    if (!e?.url || typeof e.url !== 'string') continue;
    const name = String(e?.meta?.originalname || '').toLowerCase();
    if (name.includes('back')) {
      if (!out.back) out.back = e.url;
    } else if (name.includes('front')) {
      if (!out.front) out.front = e.url;
    } else {
      unlabeled.push(e.url);
    }
  }
  for (const u of unlabeled) {
    if (!out.front) out.front = u;
    else if (!out.back) out.back = u;
  }
  return out;
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
// Parse compound imaging responses like "Yes, x-ray last year January 2025 at Presbyterian Hospital"
function parseCompoundImagingResponse(value: string, result: any): void {
  const lowerValue = value.toLowerCase();
  
  // Extract imaging type (MRI, CT, X-ray, Ultrasound, etc.)
  const typeMatch = lowerValue.match(/\b(x[\s-]?ray|mri|ct\s*scan|ct|ultrasound|sonogram|angiogram|venogram|doppler)\b/i);
  if (typeMatch) {
    const typeMap: Record<string, string> = {
      'xray': 'X-ray', 'x ray': 'X-ray', 'x-ray': 'X-ray',
      'mri': 'MRI', 'ct scan': 'CT Scan', 'ct': 'CT Scan',
      'ultrasound': 'Ultrasound', 'sonogram': 'Ultrasound',
      'angiogram': 'Angiogram', 'venogram': 'Venogram', 'doppler': 'Doppler'
    };
    const matched = typeMatch[1].toLowerCase().replace(/\s+/g, ' ');
    result.pathology_info.imaging_type = typeMap[matched] || typeMatch[1];
    console.log(`[AUTO-PARSE IMAGING] Extracted imaging_type: ${result.pathology_info.imaging_type}`);
  }
  
  // Extract imaging location (text after "at" or "from").
  // Lazy capture stops before connective prepositions followed by date words
  // (e.g. "Alliance Vascular in August 2025") so we never slurp the dangling
  // " in" / " on" into the location.
  const locationMatch = value.match(
    /\b(?:at|from)\s+([A-Z][A-Za-z\s.&']+?)(?=\s+(?:in|on|during|around|near)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|\d{4})|\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\s+\d{4}\b|[,.;]|$)/i
  );
  if (locationMatch && locationMatch[1]) {
    let location = locationMatch[1].trim().replace(/[,.\s]+$/, '');
    // Belt-and-suspenders cleanup in case the AI phrased things in an
    // unexpected way and a connective preposition slipped through.
    location = location
      .replace(/\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{4})?\s*$/i, '')
      .replace(/\s+\d{4}\s*$/, '')
      .replace(/\s+(in|on|at|by|during|around|near)\s*$/i, '')
      .replace(/[,.\s]+$/, '')
      .trim();
    // Discard stop-words alone or junk shorter than 3 chars.
    const stopWords = /^(in|on|at|by|the|a|an|of|and|or|during|around|near)$/i;
    if (location.length > 2 && !stopWords.test(location)) {
      result.medical_info.imaging_location = location;
      console.log(`[AUTO-PARSE IMAGING] Extracted imaging_location: ${location}`);
    }
  }
  
  // Extract imaging when (date/timeframe references)
  const whenPatterns = [
    // "24th August 2025" / "24 August 2025"
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i,
    // "August 24, 2025" / "August 2025"
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/i,
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
    /\b\d{4}\b(?=\s|$|,)/,
    /\b(last\s+(?:year|month|week)|(?:\d+)\s+(?:years?|months?|weeks?)\s+ago)\b/i,
    /\b(recently|this\s+year|earlier\s+this\s+year)\b/i
  ];
  
  for (const pattern of whenPatterns) {
    const whenMatch = value.match(pattern);
    if (whenMatch) {
      result.medical_info.imaging_when = whenMatch[0].trim();
      console.log(`[AUTO-PARSE IMAGING] Extracted imaging_when: ${result.medical_info.imaging_when}`);
      break;
    }
  }
}

// Strip GHL "Patient Intake Summary" blob — a single-line concatenation of every
// procedure template (GAE Info / PAE Info / UFE Info / PFE Info / etc.) with no
// newlines or pipes between fields. Without this, fallback regexes like
// /Duration:\s*([^\n|]+)/i greedily slurp every subsequent label, dumping garbage
// like "Over 1 year  OA Diagnosis: ☑️ YES  Age: ... PFE Info Morning Pain:..."
// into Duration, Symptoms, and Insurance fields. The structured "Pathology
// Information:" / "Insurance Information:" sections above the blob already
// contain the same data in a parser-friendly format, so removing the blob
// loses no information.
function stripPatientIntakeSummary(intakeNotes: string): string {
  if (!intakeNotes) return intakeNotes;
  // Match the entire "Patient Intake Summary:" line (single-line blob).
  return intakeNotes.replace(/Patient Intake Summary:[^\n]*/gi, 'Patient Intake Summary: [stripped]');
}

function fallbackRegexParsing(rawIntakeNotes: string): any {
  console.log('[AUTO-PARSE FALLBACK] Using regex-based fallback parsing...');
  const intakeNotes = stripPatientIntakeSummary(rawIntakeNotes);
  
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
      location: null as string | null,
      primary_complaint: null as string | null,
      symptoms: null as string | null,
      pain_level: null as string | null,
      affected_area: null as string | null,
      affected_knee: null as string | null,
      affected_side: null as string | null,
      duration: null as string | null,
      previous_treatments: null as string | null,
      oa_tkr_diagnosed: null as string | null,
      imaging_done: null as string | null
    },
    medical_info: {
      pcp_name: null as string | null,
      pcp_phone: null as string | null,
      imaging_details: null as string | null,
      imaging_facility: null as string | null,
      imaging_phone: null as string | null,
      imaging_location: null as string | null,
      imaging_when: null as string | null,
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
      // Smart parsing of compound imaging responses
      parseCompoundImagingResponse(value, result);
      console.log(`[AUTO-PARSE FALLBACK] Extracted imaging_details: ${value}`);
      break;
    }
  }

  // Extract insurance provider
  // PRIORITY 1: explicit "Insurance Provider:" line (real carrier from intake form)
  // Skip lines that are screening questions like "Please select your GAE insurance provider:"
  const realProviderMatch = intakeNotes.match(/^[ \t]*Insurance Provider\s*:\s*([^\n|]+)/im);
  if (realProviderMatch && realProviderMatch[1]) {
    const val = realProviderMatch[1].trim();
    result.insurance_info.insurance_provider = val;
    console.log(`[AUTO-PARSE FALLBACK] Extracted real insurance_provider: ${val}`);
  } else {
    // PRIORITY 2: fall back to screening / generic patterns
    const insuranceProviderPatterns = [
      /Please select your[^:\n]*insurance provider:\s*([^\n|]+)/i,
      /insurance provider:\s*([^\n|]+)/i,
      /insurance:\s*([^\n|]+)/i,
    ];
    for (const pattern of insuranceProviderPatterns) {
      const match = intakeNotes.match(pattern);
      if (match && match[1]) {
        result.insurance_info.insurance_provider = match[1].trim();
        console.log(`[AUTO-PARSE FALLBACK] Extracted insurance_provider (fallback): ${match[1].trim()}`);
        break;
      }
    }
  }

  // Extract Insurance Plan separately - never copy provider into plan
  const planMatch = intakeNotes.match(/^[ \t]*Insurance Plan\s*:\s*([^\n|]+)/im);
  if (planMatch && planMatch[1]) {
    result.insurance_info.insurance_plan = planMatch[1].trim();
    console.log(`[AUTO-PARSE FALLBACK] Extracted insurance_plan: ${planMatch[1].trim()}`);
  }

  // Extract Member ID / Insurance ID Number FIRST so the more-specific
  // "Insurance ID Number" pattern wins before the Group regex runs.
  const memberIdPatterns = [
    /Insurance ID Number:\s*([^\n|]+)/i,
    /Member ID\s*[#:]*\s*([^\n|]+)/i,
    /Member Number:\s*([^\n|]+)/i,
    /Insurance ID\s*[#:]+\s*([^\n|]+)/i,
    /Subscriber ID:\s*([^\n|]+)/i,
    /Policy (?:Number|ID|#):\s*([^\n|]+)/i,
  ];

  for (const pattern of memberIdPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      result.insurance_info.insurance_id_number = match[1].trim();
      console.log(`[AUTO-PARSE FALLBACK] Extracted insurance_id_number: ${match[1].trim()}`);
      break;
    }
  }

  // Extract Group Number (does NOT touch insurance_id_number anymore)
  const groupPatterns = [
    /Insurance Group Number:\s*([^\n|]+)/i,
    /Group #:\s*([^\n|]+)/i,
    /Group Number:\s*([^\n|]+)/i,
    /Group:\s*([^\n|]+)/i
  ];

  for (const pattern of groupPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!isInvalidGroupNumber(candidate)) {
        result.insurance_info.insurance_group_number = candidate;
        console.log(`[AUTO-PARSE FALLBACK] Extracted group_number: ${candidate}`);
      } else {
        console.log(`[AUTO-PARSE FALLBACK] Rejected invalid group_number candidate: ${candidate}`);
      }
      break;
    }
  }

  // ============================================================
  // STC-style "Insurance: Plan=X; Group#=Y; Upload=...; Alt Selection=Z" segment
  // Some intake forms (notably STC GAE) emit either `Key=Value` or `Key Value`
  // separators inside a single "Insurance: ..." line. The generic patterns above
  // either miss them or capture the entire blob into insurance_provider.
  // This block runs AFTER the generic patterns and:
  //   - Promotes Alt Selection -> provider/plan when Plan is missing or garbage (e.g. "B")
  //   - Fills group_number from `Group#=...`
  //   - Strips Upload=https://... from being mistaken as provider
  // It NEVER overwrites a value that was already cleanly extracted above.
  {
    // Isolate the Insurance segment: between "Insurance:" / "Insurance " and
    // the next /n marker, "Pathology", or end of string.
    const segMatch = intakeNotes.match(/Insurance\s*:\s*([\s\S]+?)(?:\/n|\bPathology\b|$)/i);
    if (segMatch && segMatch[1]) {
      const segment = segMatch[1].trim();
      // Token-split by ; (the consistent delimiter in these forms)
      const tokens = segment.split(/;+/).map(t => t.trim()).filter(Boolean);
      let segPlan: string | null = null;
      let segGroup: string | null = null;
      let segAlt: string | null = null;
      for (const tok of tokens) {
        // Accept both `Key=Value` and `Key Value` and `Key: Value`
        const kv = tok.match(/^(Plan|Group\s*#?|Upload|Alt(?:ernate)?\s*Selection|Notes)\b\s*[:=]?\s*(.+)$/i);
        if (!kv) continue;
        const keyRaw = kv[1].toLowerCase().replace(/\s+/g, ' ').trim();
        const val = kv[2].trim();
        if (!val) continue;
        if (keyRaw === 'plan') segPlan = val;
        else if (keyRaw.startsWith('group')) segGroup = val;
        else if (keyRaw.startsWith('alt')) segAlt = val;
        // Upload / Notes intentionally ignored here (Upload handled elsewhere)
      }

      // Helper: treat single-char or non-alpha values like "B" as missing
      const isUsableProvider = (v: string | null) => {
        if (!v) return false;
        const cleaned = v.replace(/[^A-Za-z]/g, '');
        return cleaned.length >= 3;
      };

      // If existing provider is empty OR was wrongly grabbed (contains '=' or
      // 'Group#' or 'Upload=' from the blob fallback), reset it before re-deriving.
      const existing = result.insurance_info.insurance_provider;
      if (existing && /(Plan\s*[:=]|Group\s*#|Upload\s*[:=]|\/n)/i.test(existing)) {
        console.log(`[AUTO-PARSE FALLBACK] Discarding blob-captured provider: ${existing.substring(0, 60)}`);
        result.insurance_info.insurance_provider = null;
      }

      // Provider/plan promotion:
      //   1. Use Plan value if it's a usable carrier name
      //   2. Otherwise fall back to Alt Selection (real carrier in STC GAE forms)
      if (!result.insurance_info.insurance_provider) {
        if (isUsableProvider(segPlan)) {
          result.insurance_info.insurance_provider = segPlan;
          console.log(`[AUTO-PARSE FALLBACK] Extracted insurance_provider from Plan segment: ${segPlan}`);
        } else if (isUsableProvider(segAlt)) {
          result.insurance_info.insurance_provider = segAlt;
          console.log(`[AUTO-PARSE FALLBACK] Promoted Alt Selection to insurance_provider: ${segAlt}`);
        }
      }
      if (!result.insurance_info.insurance_plan) {
        if (isUsableProvider(segPlan)) {
          result.insurance_info.insurance_plan = segPlan;
          console.log(`[AUTO-PARSE FALLBACK] Extracted insurance_plan from Plan segment: ${segPlan}`);
        } else if (isUsableProvider(segAlt)) {
          result.insurance_info.insurance_plan = segAlt;
          console.log(`[AUTO-PARSE FALLBACK] Promoted Alt Selection to insurance_plan: ${segAlt}`);
        }
      }
      if (!result.insurance_info.insurance_group_number && segGroup && !isInvalidGroupNumber(segGroup)) {
        result.insurance_info.insurance_group_number = segGroup;
        console.log(`[AUTO-PARSE FALLBACK] Extracted group_number from segment: ${segGroup}`);
      }
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

  // Extract PCP — prefer Name-labeled line; otherwise fall back to a generic PCP/Primary Care line
  // that is NOT a phone/number label.
  const pcpExtracted = extractPcpNameAndPhone(intakeNotes);
  if (pcpExtracted.name) {
    result.medical_info.pcp_name = pcpExtracted.name;
    console.log(`[AUTO-PARSE FALLBACK] Extracted PCP name: ${pcpExtracted.name}`);
  }
  if (pcpExtracted.phone && !result.medical_info.pcp_phone) {
    result.medical_info.pcp_phone = pcpExtracted.phone;
    console.log(`[AUTO-PARSE FALLBACK] Extracted PCP phone: ${pcpExtracted.phone}`);
  }

  // Extract Imaging Facility
  const imagingFacilityPatterns = [
    /imaging facility:\s*([^\n|]+)/i,
    /imaging location:\s*([^\n|]+)/i,
    /where was imaging done:\s*([^\n|]+)/i,
    /where.*?imaging.*?done:\s*([^\n|]+)/i,
    /imaging center:\s*([^\n|]+)/i,
  ];
  
  for (const pattern of imagingFacilityPatterns) {
    const match = intakeNotes.match(pattern);
    if (match && match[1]) {
      result.medical_info.imaging_facility = match[1].trim();
      console.log(`[AUTO-PARSE FALLBACK] Extracted imaging_facility: ${match[1].trim()}`);
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
  if (upperNotes.includes('NEUROPATHY') || upperNotes.includes('NUMBNESS COLD FEET') || upperNotes.includes('NUMBNESS/COLD FEET')) {
    result.pathology_info.procedure_type = 'Neuropathy';
  } else if (upperNotes.includes('TAE') || upperNotes.includes('THYROID')) {
    result.pathology_info.procedure_type = 'TAE';
  } else if (upperNotes.includes('HAE') || upperNotes.includes('HEMORRHOID ARTERY')) {
    result.pathology_info.procedure_type = 'HAE';
  } else if (upperNotes.includes('GAE') || upperNotes.includes('KNEE')) {
    result.pathology_info.procedure_type = 'GAE';
  } else if (upperNotes.includes('UFE') || upperNotes.includes('FIBROID')) {
    result.pathology_info.procedure_type = 'UFE';
  } else if (upperNotes.includes('PAE') || upperNotes.includes('PROSTATE')) {
    result.pathology_info.procedure_type = 'PAE';
  } else if (upperNotes.includes('PAD') || upperNotes.includes('PERIPHERAL ARTERY') || upperNotes.includes('POOR CIRCULATION')) {
    result.pathology_info.procedure_type = 'PAD';
  } else if (upperNotes.includes('FSE') || upperNotes.includes('FROZEN SHOULDER') || upperNotes.includes('SHOULDER')) {
    result.pathology_info.procedure_type = 'FSE';
  }


  // Filter out pathology data from wrong procedures in multi-procedure notes
  // e.g., "Pathology (by procedure): GAE—Age Range 56 and above; UFE—Period Length 3-5 days"
  const multiProcedureMatch = intakeNotes.match(/Pathology\s*\(by procedure\)\s*:\s*(.+)/i);
  if (multiProcedureMatch && result.pathology_info.procedure_type) {
    const procedureSection = multiProcedureMatch[1];
    const targetProc = result.pathology_info.procedure_type;
    
    // Check if the target procedure has its own section in the multi-procedure block
    const procRegex = new RegExp(`${targetProc}[—\\-–]([^;]+)`, 'i');
    const targetMatch = procedureSection.match(procRegex);
    
    if (targetMatch) {
      // Only use data from the matching procedure section
      console.log(`[AUTO-PARSE FALLBACK] Found ${targetProc} section in multi-procedure notes: ${targetMatch[1].trim()}`);
    } else {
      // Target procedure has no section - clear any pathology data that may have been
      // incorrectly extracted from other procedure sections
      console.log(`[AUTO-PARSE FALLBACK] No ${targetProc} section found in multi-procedure notes - clearing wrong procedure data`);
      result.pathology_info.symptoms = null;
      result.pathology_info.pain_level = null;
      result.pathology_info.duration = null;
      result.pathology_info.primary_complaint = null;
      result.pathology_info.affected_area = null;
      result.pathology_info.affected_knee = null;
      result.pathology_info.affected_side = null;
      result.pathology_info.previous_treatments = null;
      result.pathology_info.oa_tkr_diagnosed = null;
      result.pathology_info.imaging_done = null;
    }
  }

  console.log('[AUTO-PARSE FALLBACK] Regex parsing complete');
  return result;
}

// Post-AI enrichment: Always run regex extraction for critical fields
// This catches anything the AI parser might have missed (e.g., imaging_details)
function enrichWithCriticalFields(parsedData: any, rawIntakeNotes: string): any {
  if (!rawIntakeNotes) return parsedData;
  const intakeNotes = stripPatientIntakeSummary(rawIntakeNotes);
  
  // Ensure medical_info exists
  if (!parsedData.medical_info) {
    parsedData.medical_info = {};
  }
  if (!parsedData.pathology_info) {
    parsedData.pathology_info = {};
  }

  // === Location Picker (GHL custom field) — sets location for unscheduled leads (ECCO, Premier, etc.)
  if (!parsedData.pathology_info.location) {
    const locMatch = rawIntakeNotes.match(/Location Picker\s*:\s*([^\n|]+)/i);
    if (locMatch && locMatch[1]) {
      const loc = locMatch[1].trim();
      if (loc && !/^(unknown|n\/a|none)$/i.test(loc)) {
        parsedData.pathology_info.location = loc;
        console.log(`[AUTO-PARSE ENRICH] Extracted Location Picker: ${loc}`);
      }
    }
  }

  // === Service Name (GHL custom field) — high-priority override for procedure_type
  const serviceMatch = rawIntakeNotes.match(/Service Name\s*:\s*(GAE|PFE|UFE|PAE|HAE|PAD|FSE|TAE|Neuropathy)\b/i);
  if (serviceMatch && serviceMatch[1]) {
    const raw = serviceMatch[1];
    const svc = /neuropathy/i.test(raw) ? 'Neuropathy' : raw.toUpperCase();
    if (parsedData.pathology_info.procedure_type !== svc) {
      console.log(`[AUTO-PARSE ENRICH] Service Name override: ${parsedData.pathology_info.procedure_type || 'null'} → ${svc}`);
      parsedData.pathology_info.procedure_type = svc;
    }
  }


  // === PFE keyword fallback (plantar fasciitis) when no procedure_type detected
  if (!parsedData.pathology_info.procedure_type) {
    if (/\b(plantar\s+fasciitis|plantar|heel\s+pain|pfe)\b/i.test(intakeNotes)) {
      parsedData.pathology_info.procedure_type = 'PFE';
      console.log(`[AUTO-PARSE ENRICH] PFE keyword fallback applied`);
    }
  }
  
  // Extract imaging details — always check regex sources because the AI often
  // returns a truncated value like "Yes, MRI" while a richer free-text field
  // (e.g. "Had Imaging Before?: MRI 2 weeks ago in May at Vascular Surgery
  // Associates clinic in Ellicott") exists in the raw notes. Prefer the
  // longer/richer value so imaging_when / imaging_location / imaging_facility
  // can be extracted downstream.
  {
    // Multi-line aware: capture continuation lines (e.g. GHL stores
    // "Yes and x-ray.\n24th August 2025 at Joint & Vascular Institute in Rockford"
    // as a single field value).
    const imagingPatterns = [
      /^\s*had imaging before\s*\??\s*:\s*(.*)$/i,
      /^\s*had_imaging_before\s*\??\s*:\s*(.*)$/i,
      /^\s*have you had.*?imaging.*?\??\s*:\s*(.*)$/i,
      /^\s*previous imaging\s*\??\s*:\s*(.*)$/i,
      /^\s*imaging_done\s*\??\s*:\s*(.*)$/i
    ];

    let bestValue: string | null = parsedData.medical_info.imaging_details || null;
    for (const pattern of imagingPatterns) {
      const value = extractMultiLineFieldValue(intakeNotes, pattern);
      if (value) {
        // Prefer this value if we don't have one yet, or if it's meaningfully
        // richer than the current value (length > current + 5 chars).
        if (!bestValue || value.length > (bestValue.length + 5)) {
          bestValue = value;
        }
      }
    }


    if (bestValue && bestValue !== parsedData.medical_info.imaging_details) {
      parsedData.medical_info.imaging_details = bestValue;
      console.log(`[AUTO-PARSE ENRICH] Upgraded imaging_details via regex: ${bestValue}`);
    }
    if (bestValue) {
      // Always re-run compound parsing on the richest value so imaging_type,
      // imaging_location, imaging_when get populated even when the AI parser
      // produced a short imaging_details string.
      parseCompoundImagingResponse(bestValue, {
        pathology_info: parsedData.pathology_info || {},
        medical_info: parsedData.medical_info
      });
    }
  }

  
  // Extract PCP info if not already populated
  if (!parsedData.medical_info) parsedData.medical_info = {};
  if (!parsedData.medical_info.pcp_name || !parsedData.medical_info.pcp_phone) {
    const pcpExtracted = extractPcpNameAndPhone(intakeNotes);
    if (!parsedData.medical_info.pcp_name && pcpExtracted.name) {
      parsedData.medical_info.pcp_name = pcpExtracted.name;
      console.log(`[AUTO-PARSE ENRICH] Extracted PCP name via regex: ${pcpExtracted.name}`);
    }
    if (!parsedData.medical_info.pcp_phone && pcpExtracted.phone) {
      parsedData.medical_info.pcp_phone = pcpExtracted.phone;
      console.log(`[AUTO-PARSE ENRICH] Extracted PCP phone via regex: ${pcpExtracted.phone}`);
    }
  }
  
  // Extract generic "Notes" field if insurance_notes not already populated
  if (!parsedData.insurance_info) {
    parsedData.insurance_info = {};
  }
  if (!parsedData.insurance_info.insurance_notes) {
    // Multi-line capture: grab everything until the next labeled field, an upload/URL line, or end of section.
    const NEXT_LABEL = String.raw`(?=\n\s*(?:[A-Z][A-Za-z0-9 /&()'\-]{1,60}:|Upload\s|https?:\/\/)|$)`;
    const notesPatterns = [
      new RegExp(String.raw`Notes\s*\(Example:.*?\).*?:\s*([\s\S]+?)` + NEXT_LABEL, 'i'),
      new RegExp(String.raw`Notes\s*\(.*?optional.*?\).*?:\s*([\s\S]+?)` + NEXT_LABEL, 'i'),
      new RegExp(String.raw`(?:^|\n)\s*Notes\s*:\s*([\s\S]+?)` + NEXT_LABEL, 'i'),
      // Single-line fallbacks (preserve original behavior if multi-line lookahead fails)
      /Notes\s*\(Example:.*?\).*?:\s*([^\n]+)/i,
      /Notes\s*\(.*?optional.*?\).*?:\s*([^\n]+)/i,
      /^  Notes.*?:\s*([^\n]+)/im,
    ];

    for (const pattern of notesPatterns) {
      const match = intakeNotes.match(pattern);
      if (match && match[1]) {
        const value = match[1].replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        if (value && value.length > 0) {
          parsedData.insurance_info.insurance_notes = value;
          console.log(`[AUTO-PARSE ENRICH] Extracted insurance_notes via regex: ${value}`);
          break;
        }
      }
    }
  }

  // Backfill insurance_id_number from raw notes when the AI parser missed it.
  // Many GHL intakes ship "Insurance ID Number: 12345" verbatim, but the AI
  // occasionally drops the field. Without this fallback the Member ID never
  // syncs to the portal until a setter edits the record manually in the
  // Review Queue (reported by BVC for Stephen Domagala, etc.).
  if (!parsedData.insurance_info.insurance_id_number) {
    const idPatterns = [
      /Insurance ID Number:\s*([^\n|]+)/i,
      /Member ID\s*[#:]*\s*([^\n|]+)/i,
      /Member Number:\s*([^\n|]+)/i,
      /Insurance ID\s*[#:]+\s*([^\n|]+)/i,
      /Subscriber ID:\s*([^\n|]+)/i,
      /Policy (?:Number|ID|#):\s*([^\n|]+)/i,
    ];
    for (const pattern of idPatterns) {
      const match = intakeNotes.match(pattern);
      if (match && match[1]) {
        const v = match[1].trim();
        if (v && v.length < 80) {
          parsedData.insurance_info.insurance_id_number = v;
          console.log(`[AUTO-PARSE ENRICH] Backfilled insurance_id_number via regex: ${v}`);
        }
        break;
      }
    }
  }

  // Backfill insurance_group_number similarly when AI missed it.
  if (!parsedData.insurance_info.insurance_group_number) {
    const groupPatterns = [
      /Insurance Group Number:\s*([^\n|]+)/i,
      /Group #:\s*([^\n|]+)/i,
      /Group Number:\s*([^\n|]+)/i,
    ];
    for (const pattern of groupPatterns) {
      const match = intakeNotes.match(pattern);
      if (match && match[1]) {
        const v = match[1].trim();
        if (v && v.length < 80) {
          parsedData.insurance_info.insurance_group_number = v;
          console.log(`[AUTO-PARSE ENRICH] Backfilled insurance_group_number via regex: ${v}`);
        }
        break;
      }
    }
  }

  // Backfill insurance_provider from raw notes when AI missed it.
  // GHL emits either "Insurance Provider:" or "Please select your insurance provider:".
  if (!parsedData.insurance_info.insurance_provider) {
    const providerPatterns = [
      /^[ \t]*Insurance Provider\s*:\s*([^\n|]+)/im,
      /Please select your insurance provider\s*:\s*([^\n|]+)/i,
    ];
    for (const p of providerPatterns) {
      const m = intakeNotes.match(p);
      if (m && m[1]) {
        const v = m[1].trim();
        if (v && v.length < 80 && !/^(none|n\/a|unknown)$/i.test(v)) {
          parsedData.insurance_info.insurance_provider = v;
          console.log(`[AUTO-PARSE ENRICH] Backfilled insurance_provider via regex: ${v}`);
          break;
        }
      }
    }
  }

  // Backfill insurance_plan from raw notes when AI missed it.
  if (!parsedData.insurance_info.insurance_plan) {
    const m = intakeNotes.match(/^[ \t]*Insurance Plan\s*:\s*([^\n|]+)/im);
    if (m && m[1]) {
      const v = m[1].trim();
      if (v && v.length < 120 && !/^(none|n\/a|unknown)$/i.test(v)) {
        parsedData.insurance_info.insurance_plan = v;
        console.log(`[AUTO-PARSE ENRICH] Backfilled insurance_plan via regex: ${v}`);
      }
    }
  }

  // ============================================================
  // Secondary insurance: GHL emits "(2)" suffixed copies for the secondary
  // policy plus "Upload A Copy Of Your Insurance Card (Secondary)" containing
  // a JSON blob with the file URL. Store under parsed_insurance_info.secondary_*
  // so the portal can render a Secondary Insurance subsection.
  {
    const secondaryPlan = intakeNotes.match(/Insurance Plan\s*\(2\)\s*:\s*([^\n|]+)/i);
    const secondaryId = intakeNotes.match(/Insurance ID Number\s*\(2\)\s*:\s*([^\n|]+)/i);
    const secondaryGroup = intakeNotes.match(/Insurance Group Number\s*\(2\)\s*:\s*([^\n|]+)/i);
    const secondaryProvider = intakeNotes.match(/Insurance Provider\s*\(2\)\s*:\s*([^\n|]+)/i);

    const cleanVal = (v: string | undefined | null) => {
      if (!v) return null;
      const s = v.trim();
      if (!s || s.length > 200 || /^(none|n\/a|unknown|null)$/i.test(s)) return null;
      return s;
    };

    const planVal = cleanVal(secondaryPlan?.[1]);
    const idVal = cleanVal(secondaryId?.[1]);
    const groupVal = cleanVal(secondaryGroup?.[1]);
    const providerVal = cleanVal(secondaryProvider?.[1]);

    // Secondary upload URLs — pulled from the JSON blob after the field label.
    // GHL stores both front + back as a JSON object keyed by uuid.
    let secondaryFrontUrl: string | null = null;
    let secondaryBackUrl: string | null = null;
    const secondaryUploadLine = intakeNotes.match(/Upload A Copy Of Your Insurance Card\s*\(Secondary\)\s*:\s*(\{[^\n]+\})/i);
    if (secondaryUploadLine && secondaryUploadLine[1]) {
      const fb = extractFrontBackFromJsonOrString(secondaryUploadLine[1]);
      secondaryFrontUrl = fb.front;
      secondaryBackUrl = fb.back;
    } else {
      // Fallback: bare URL on the line
      const bare = intakeNotes.match(/Upload A Copy Of Your Insurance Card\s*\(Secondary\)\s*:\s*([^\n]+)/i);
      if (bare && bare[1]) {
        const urlMatch = bare[1].match(/https:\/\/services\.leadconnectorhq\.com\/documents\/download\/[a-zA-Z0-9_-]+/);
        if (urlMatch) secondaryFrontUrl = urlMatch[0];
      }
    }

    if (planVal || idVal || groupVal || providerVal || secondaryFrontUrl || secondaryBackUrl) {
      if (planVal) parsedData.insurance_info.secondary_plan = planVal;
      if (idVal) parsedData.insurance_info.secondary_id_number = idVal;
      if (groupVal) parsedData.insurance_info.secondary_group_number = groupVal;
      if (providerVal) parsedData.insurance_info.secondary_provider = providerVal;
      if (secondaryFrontUrl) {
        parsedData.insurance_info.secondary_card_front_url = secondaryFrontUrl;
        parsedData.insurance_info.secondary_card_url = secondaryFrontUrl; // legacy compat
      }
      if (secondaryBackUrl) parsedData.insurance_info.secondary_card_back_url = secondaryBackUrl;
      console.log('[AUTO-PARSE ENRICH] Extracted secondary insurance:', {
        plan: planVal, id: idVal, group: groupVal, provider: providerVal,
        front: !!secondaryFrontUrl, back: !!secondaryBackUrl,
      });
    }
  }


  // Backfill PCP name/phone from raw notes when AI missed it.
  // Curly-apostrophe-safe: "Primary Care Doctor's Name and Phone:" or "Primary Care Doctor's …".
  // Also handles GHL splitting Name and Phone into two separate labeled lines.
  if (!parsedData.medical_info) parsedData.medical_info = {};
  if (!parsedData.medical_info.pcp_name || !parsedData.medical_info.pcp_phone) {
    const pcpExtracted = extractPcpNameAndPhone(intakeNotes);
    if (!parsedData.medical_info.pcp_name && pcpExtracted.name) {
      parsedData.medical_info.pcp_name = pcpExtracted.name;
      console.log(`[AUTO-PARSE ENRICH] Backfilled pcp_name via regex: ${pcpExtracted.name}`);
    }
    if (!parsedData.medical_info.pcp_phone && pcpExtracted.phone) {
      parsedData.medical_info.pcp_phone = pcpExtracted.phone;
      console.log(`[AUTO-PARSE ENRICH] Backfilled pcp_phone via regex: ${pcpExtracted.phone}`);
    }
  }



  // Backfill imaging_details from "Had Imaging Before ?:" when AI missed it.
  if (!parsedData.medical_info.imaging_details) {
    const v = extractMultiLineFieldValue(intakeNotes, /^\s*Had Imaging Before\s*\??\s*:\s*(.*)$/i);
    if (v) {
      if (!/^(none|n\/a|unknown|no)$/i.test(v)) {
        parsedData.medical_info.imaging_details = v;
        console.log(`[AUTO-PARSE ENRICH] Backfilled imaging_details via regex: ${v}`);
      }
    }

  }
  
  // Ensure pathology_info exists
  if (!parsedData.pathology_info) {
    parsedData.pathology_info = {};
  }
  
  // === PAD-specific field extraction from intake notes text ===
  // Only run for PAD procedure — otherwise address fragments like "Smokey Cypress Loop"
  // or non-PAD content can pollute smoking_status / blood_thinners.
  const isPAD = (parsedData.pathology_info?.procedure_type || '').toString().toUpperCase() === 'PAD';

  if (isPAD) {
    // Smoking/tobacco status — require explicit label with word boundary, stop at pipe
    if (!parsedData.medical_info.smoking_status) {
      const smokeMatch = intakeNotes.match(/\b(?:smoking\s+status|tobacco(?:\s+use)?|smoker)\s*:\s*([^\n|]+)/i);
      if (smokeMatch && smokeMatch[1]) {
        parsedData.medical_info.smoking_status = smokeMatch[1].trim();
        console.log(`[AUTO-PARSE ENRICH] Extracted smoking_status via regex: ${parsedData.medical_info.smoking_status}`);
      }
    }

    // Blood thinners — require word boundary label, stop at pipe
    if (!parsedData.medical_info.blood_thinners) {
      const btMatch = intakeNotes.match(/\bblood\s+thinner[^:|\n]*:\s*([^\n|]+)/i);
      if (btMatch && btMatch[1]) {
        const val = btMatch[1].trim().toLowerCase();
        parsedData.medical_info.blood_thinners = val.includes('yes') ? 'YES' : val.includes('no') ? 'NO' : btMatch[1].trim();
        console.log(`[AUTO-PARSE ENRICH] Extracted blood_thinners via regex: ${parsedData.medical_info.blood_thinners}`);
      }
    }
  }

  
  // Vascular provider
  if (!parsedData.pathology_info.vascular_provider) {
    const vpMatch = intakeNotes.match(/vascular provider[^:]*:\s*([^\n]+)/i);
    if (vpMatch && vpMatch[1]) {
      parsedData.pathology_info.vascular_provider = vpMatch[1].trim();
      console.log(`[AUTO-PARSE ENRICH] Extracted vascular_provider via regex: ${parsedData.pathology_info.vascular_provider}`);
    }
  }
  
  // PAD/poor circulation diagnosed
  if (!parsedData.pathology_info.pad_diagnosed) {
    const padMatch = intakeNotes.match(/(?:have you ever been told you have PAD|poor circulation)[^:]*\??\s*:\s*([^\n]+)/i);
    if (padMatch && padMatch[1]) {
      const padVal = padMatch[1].trim().toLowerCase();
      if (padVal.includes('yes') || padVal.includes('no') || padVal === '☑️ yes') {
        parsedData.pathology_info.pad_diagnosed = padMatch[1].trim();
        console.log(`[AUTO-PARSE ENRICH] Extracted pad_diagnosed via regex: ${parsedData.pathology_info.pad_diagnosed}`);
      }
    }
  }
  
  // Validate pad_diagnosed contains only Yes/No values (guard against name contamination)
  if (parsedData.pathology_info.pad_diagnosed) {
    const padValCheck = String(parsedData.pathology_info.pad_diagnosed).toLowerCase();
    if (!padValCheck.includes('yes') && !padValCheck.includes('no')) {
      console.log(`[AUTO-PARSE ENRICH] Clearing invalid pad_diagnosed value: ${parsedData.pathology_info.pad_diagnosed}`);
      parsedData.pathology_info.pad_diagnosed = null;
    }
  }
  
  // Open wounds
  if (!parsedData.pathology_info.open_wounds) {
    const owMatch = intakeNotes.match(/open wounds[^:]*:\s*([^\n]+)/i);
    if (owMatch && owMatch[1]) {
      parsedData.pathology_info.open_wounds = owMatch[1].trim();
      console.log(`[AUTO-PARSE ENRICH] Extracted open_wounds via regex: ${parsedData.pathology_info.open_wounds}`);
  }

  // === UFE STEP-specific field extraction (deterministic regex on raw notes) ===
  // Captures the UFE intake funnel answers (period heaviness, pelvic pain, menstrual cycle, period length).
  const isUFE =
    parsedData.pathology_info.procedure_type === 'UFE' ||
    /UFE STEP\s*\d+\s*\|/i.test(intakeNotes);
  if (isUFE) {
    parsedData.pathology_info.procedure_type = 'UFE';
    if (!parsedData.pathology_info.primary_complaint) {
      parsedData.pathology_info.primary_complaint = 'UFE / Fibroids';
    }
    if (!parsedData.pathology_info.affected_area) {
      parsedData.pathology_info.affected_area = 'Uterus';
    }

    const ufeFields: Array<[string, RegExp]> = [
      ['period_heaviness', /UFE STEP\s*\d+\s*\|\s*How heavy are your periods\s*\??\s*:\s*([^\n]+)/i],
      ['pelvic_pain_frequency', /UFE STEP\s*\d+\s*\|\s*How often do you experience pelvic pain[^:]*:\s*([^\n]+)/i],
      ['menstrual_cycle', /UFE STEP\s*\d+\s*\|\s*Which best describes your menstrual cycle\s*\??\s*:\s*([^\n]+)/i],
      ['period_length', /UFE STEP\s*\d+\s*\|\s*[^|\n:]*Period Length[^:]*:\s*([^\n]+)/i],
    ];

    const captured: Record<string, string> = {};
    for (const [field, re] of ufeFields) {
      if (parsedData.pathology_info[field]) {
        captured[field] = String(parsedData.pathology_info[field]);
        continue;
      }
      const m = intakeNotes.match(re);
      if (m && m[1]) {
        const val = m[1].trim().replace(/\s+/g, ' ');
        parsedData.pathology_info[field] = val;
        captured[field] = val;
        console.log(`[AUTO-PARSE UFE] Extracted ${field}: ${val}`);
      }
    }

    // Backfill `symptoms` as a friendly joined summary so existing UI shows context
    if (Object.keys(captured).length > 0) {
      const labelMap: Record<string, string> = {
        period_heaviness: 'Period heaviness',
        pelvic_pain_frequency: 'Pelvic pain frequency',
        menstrual_cycle: 'Menstrual cycle',
        period_length: 'Period length',
      };
      const summary = Object.entries(captured)
        .map(([k, v]) => `${labelMap[k] || k}: ${v}`)
        .join(' | ');
      const existing = parsedData.pathology_info.symptoms;
      if (!existing || /^(yes|no)$/i.test(String(existing)) || String(existing).length < summary.length) {
        parsedData.pathology_info.symptoms = summary;
        console.log(`[AUTO-PARSE UFE] Backfilled symptoms summary: ${summary}`);
      }
    }
  }
  }
  
  // Numbness/cold feet
  if (!parsedData.pathology_info.numbness_cold_feet) {
    const ncMatch = intakeNotes.match(/(?:numbness|cold feet|discoloration)[^:]*:\s*([^\n]+)/i);
    if (ncMatch && ncMatch[1]) {
      parsedData.pathology_info.numbness_cold_feet = ncMatch[1].trim();
      console.log(`[AUTO-PARSE ENRICH] Extracted numbness_cold_feet via regex: ${parsedData.pathology_info.numbness_cold_feet}`);
    }
  }
  
  // Worse when walking
  if (!parsedData.pathology_info.worse_when_walking) {
    const wwMatch = intakeNotes.match(/(?:worse when walking|walking.*?rest)[^:]*:\s*([^\n]+)/i);
    if (wwMatch && wwMatch[1]) {
      parsedData.pathology_info.worse_when_walking = wwMatch[1].trim();
      console.log(`[AUTO-PARSE ENRICH] Extracted worse_when_walking via regex: ${parsedData.pathology_info.worse_when_walking}`);
    }
  }
  
  // Pain to the toes
  if (!parsedData.pathology_info.pain_to_toes) {
    const ptMatch = intakeNotes.match(/pain to the toes[^:]*:\s*([^\n]+)/i);
    if (ptMatch && ptMatch[1]) {
      parsedData.pathology_info.pain_to_toes = ptMatch[1].trim();
      console.log(`[AUTO-PARSE ENRICH] Extracted pain_to_toes via regex: ${parsedData.pathology_info.pain_to_toes}`);
    }
  }
  
  // Extract imaging facility if not already populated
  if (!parsedData.medical_info.imaging_facility) {
    const facilityPatterns = [
      /imaging facility:\s*([^\n|]+)/i,
      /imaging location:\s*([^\n|]+)/i,
      /where was imaging done:\s*([^\n|]+)/i,
      /where.*?imaging.*?done:\s*([^\n|]+)/i,
      /imaging center:\s*([^\n|]+)/i,
    ];
    
    for (const pattern of facilityPatterns) {
      const match = intakeNotes.match(pattern);
      if (match && match[1]) {
        parsedData.medical_info.imaging_facility = match[1].trim();
        console.log(`[AUTO-PARSE ENRICH] Extracted imaging_facility via regex: ${match[1].trim()}`);
        break;
      }
    }
  }
  
  // === TAE STEP-specific field extraction (deterministic regex on raw notes) ===
  // For Joint & Vascular Institute TAE intake; runs even when GHL custom field defs are unavailable
  if (/TAE STEP|thyroid nodule|thyroid artery embolization/i.test(intakeNotes)) {
    parsedData.pathology_info.procedure_type = 'TAE';
    if (!parsedData.pathology_info.primary_complaint) {
      parsedData.pathology_info.primary_complaint = 'TAE Consultation';
    }
    if (!parsedData.pathology_info.affected_area) {
      parsedData.pathology_info.affected_area = 'Thyroid';
    }

    // Diagnosis: thyroid nodule / goiter
    const diagMatch = intakeNotes.match(/diagnosed with a thyroid nodule or goiter\s*\??\s*:\s*([^\n]+)/i);
    if (diagMatch && diagMatch[1] && !parsedData.pathology_info.diagnosis) {
      const v = diagMatch[1].trim();
      parsedData.pathology_info.diagnosis = /^yes/i.test(v) ? 'Thyroid nodule or goiter' : v;
      console.log(`[AUTO-PARSE TAE] Extracted diagnosis: ${parsedData.pathology_info.diagnosis}`);
    }

    // Previous treatments: doctor recommended …
    const recMatch = intakeNotes.match(/Has a doctor recommended any of the following\s*\??\s*:\s*([^\n]+)/i);
    if (recMatch && recMatch[1] && !parsedData.pathology_info.previous_treatments) {
      parsedData.pathology_info.previous_treatments = recMatch[1].trim();
      console.log(`[AUTO-PARSE TAE] Extracted previous_treatments: ${recMatch[1].trim()}`);
    }

    // Symptoms: experiencing any of the following
    const sxMatch = intakeNotes.match(/Are you experiencing any of the following\s*\??\s*:\s*([^\n]+)/i);
    if (sxMatch && sxMatch[1]) {
      const sx = sxMatch[1].trim();
      if (!parsedData.pathology_info.symptoms || /^(yes|no)$/i.test(parsedData.pathology_info.symptoms)) {
        parsedData.pathology_info.symptoms = sx;
        console.log(`[AUTO-PARSE TAE] Extracted symptoms: ${sx}`);
      }
    }

    // Imaging done (TAE STEP 2)
    const imgMatch = intakeNotes.match(/Do you have any imaging of your thyroid[^:]*:\s*([^\n]+)/i);
    if (imgMatch && imgMatch[1]) {
      const v = imgMatch[1].trim().toLowerCase();
      if (v.startsWith('yes')) parsedData.pathology_info.imaging_done = 'YES';
      else if (v.startsWith('no')) parsedData.pathology_info.imaging_done = 'NO';
      console.log(`[AUTO-PARSE TAE] Extracted imaging_done: ${parsedData.pathology_info.imaging_done}`);
    }

    // Notes: avoid surgery / minimally invasive / cosmetic concerns
    const noteParts: string[] = [];
    const avoidMatch = intakeNotes.match(/How interested are you in avoiding surgery\s*\??\s*:\s*([^\n]+)/i);
    if (avoidMatch && avoidMatch[1]) noteParts.push(`Avoiding surgery: ${avoidMatch[1].trim()}`);
    const miniMatch = intakeNotes.match(/open to a minimally invasive[^:]*:\s*([^\n]+)/i);
    if (miniMatch && miniMatch[1]) noteParts.push(`Open to minimally invasive treatment: ${miniMatch[1].trim()}`);
    const cosmMatch = intakeNotes.match(/cosmetic concerns about your neck\s*\??\s*:\s*([^\n]+)/i);
    if (cosmMatch && cosmMatch[1]) noteParts.push(`Cosmetic concerns: ${cosmMatch[1].trim()}`);
    if (noteParts.length > 0) {
      const joined = noteParts.join(' | ');
      parsedData.pathology_info.other_notes = parsedData.pathology_info.other_notes
        ? `${parsedData.pathology_info.other_notes} | ${joined}`
        : joined;
      console.log(`[AUTO-PARSE TAE] Extracted other_notes: ${joined}`);
    }
  }

  // === GAE STEP-specific field extraction (deterministic regex on raw notes) ===
  // These extract from "GAE STEP 1 | ..." / "GAE STEP 2 | ..." lines that the AI parser commonly misses
  const yesNoFromVal = (s: string): string | null => {
    const v = s.toLowerCase().trim();
    if (v.startsWith('yes') || v.includes('☑️ yes')) return 'YES';
    if (v.startsWith('no') || v.includes('☐ no')) return 'NO';
    return null;
  };

  // Helpers to detect "default/garbage" values that should be overwritten by regex truth from raw notes
  const isJunkYesNo = (v: any): boolean => {
    if (v === null || v === undefined) return true;
    const s = String(v).trim();
    if (!s) return true;
    // Keep only clean YES/NO; anything else (e.g. "☑️ YES", "Yes - knee", checkbox noise) is junk
    return !/^(YES|NO)$/.test(s);
  };
  const isJunkText = (v: any): boolean => {
    if (v === null || v === undefined) return true;
    const s = String(v).trim();
    if (!s) return true;
    // Treat short checkbox-like answers and bare yes/no as junk for free-text fields
    if (/^(☑️?\s*yes|☐?\s*no|yes|no|n\/a|none|unknown)$/i.test(s)) return true;
    return false;
  };

  // OA / TKR diagnosis — force-overwrite when raw notes give a clean YES/NO
  {
    const m = intakeNotes.match(/diagnosed with knee osteoarthritis[^:?]*\??:\s*([^\n]+)/i);
    if (m && m[1]) {
      const yn = yesNoFromVal(m[1]);
      if (yn && (isJunkYesNo(parsedData.pathology_info.oa_tkr_diagnosed) || parsedData.pathology_info.oa_tkr_diagnosed !== yn)) {
        const prev = parsedData.pathology_info.oa_tkr_diagnosed;
        parsedData.pathology_info.oa_tkr_diagnosed = yn;
        console.log(`[AUTO-PARSE ENRICH] Force-overwrote oa_tkr_diagnosed: ${prev} → ${yn}`);
      }
    }
  }

  // Trauma-related onset — force-overwrite when raw notes give a clean YES/NO
  {
    const m = intakeNotes.match(/symptoms? begin after.*?(?:trauma|injury)[^:?]*\??:\s*([^\n]+)/i);
    if (m && m[1]) {
      const yn = yesNoFromVal(m[1]);
      if (yn && (isJunkYesNo(parsedData.pathology_info.trauma_related_onset) || parsedData.pathology_info.trauma_related_onset !== yn)) {
        const prev = parsedData.pathology_info.trauma_related_onset;
        parsedData.pathology_info.trauma_related_onset = yn;
        console.log(`[AUTO-PARSE ENRICH] Force-overwrote trauma_related_onset: ${prev} → ${yn}`);
      }
    }
  }

  // Previous treatments tried — force-overwrite when current value is junk/checkbox noise
  {
    const m = intakeNotes.match(/what treatments? have you tried[^:?]*\??:\s*([^\n]+)/i);
    if (m && m[1]) {
      const extracted = m[1].trim();
      if (extracted.length > 2 && (isJunkText(parsedData.pathology_info.previous_treatments) || /☑️|☐/.test(String(parsedData.pathology_info.previous_treatments || '')))) {
        const prev = parsedData.pathology_info.previous_treatments;
        parsedData.pathology_info.previous_treatments = extracted;
        console.log(`[AUTO-PARSE ENRICH] Force-overwrote previous_treatments: ${prev} → ${extracted}`);
      }
    }
  }

  // Age range — force-overwrite when current value is junk
  {
    const m = intakeNotes.match(/how old are you[^:?]*\??:\s*([^\n]+)/i);
    if (m && m[1]) {
      const extracted = m[1].trim();
      if (extracted.length > 1 && (isJunkText(parsedData.pathology_info.age_range) || /☑️|☐/.test(String(parsedData.pathology_info.age_range || '')))) {
        const prev = parsedData.pathology_info.age_range;
        parsedData.pathology_info.age_range = extracted;
        console.log(`[AUTO-PARSE ENRICH] Force-overwrote age_range: ${prev} → ${extracted}`);
      }
    }
  }

  // Pain level (1-10 scale)
  if (!parsedData.pathology_info.pain_level) {
    const m = intakeNotes.match(/scale of 1[\s-]*to?[\s-]*10.*?pain[^:?]*\??:\s*([^\n]+)/i);
    if (m && m[1]) {
      const num = m[1].match(/\d+/);
      if (num) {
        parsedData.pathology_info.pain_level = num[0];
        console.log(`[AUTO-PARSE ENRICH] Extracted pain_level via regex: ${num[0]}`);
      }
    }
  }

  // Symptoms description — override if AI got just "☑️ YES" or similar checkbox noise
  const currentSymptoms = String(parsedData.pathology_info.symptoms || '').trim();
  const isJustCheckbox = /^(☑️\s*yes|☐\s*no|yes|no)$/i.test(currentSymptoms);
  if (!currentSymptoms || isJustCheckbox) {
    const m = intakeNotes.match(/describe the symptoms[^:?]*\??:\s*([^\n]+)/i);
    if (m && m[1] && m[1].trim().length > 5) {
      parsedData.pathology_info.symptoms = m[1].trim();
      console.log(`[AUTO-PARSE ENRICH] Replaced symptoms via regex: ${m[1].trim()}`);
    }
  }

  // How long experiencing pain → duration
  if (!parsedData.pathology_info.duration) {
    const m = intakeNotes.match(/how long have you been experiencing[^:?]*\??:\s*([^\n]+)/i);
    if (m && m[1]) {
      parsedData.pathology_info.duration = m[1].trim();
      console.log(`[AUTO-PARSE ENRICH] Extracted duration via regex: ${m[1].trim()}`);
    }
  }

  // Affected side (Left / Right / Both) — applies to procedures with a laterality question
  {
    const proc = String(parsedData.pathology_info.procedure_type || '').toUpperCase();
    const SIDE_PROCEDURES = ['GAE', 'PFE', 'FSE', 'PAD', 'ATE', 'NEUROPATHY'];
    if (SIDE_PROCEDURES.includes(proc)) {
      const current = parsedData.pathology_info.affected_side;
      if (!current || !String(current).trim()) {
        const m = intakeNotes.match(/which side is affected[^:?\n]*\??:\s*([^\n]+)/i);
        if (m && m[1]) {
          const lv = m[1].toLowerCase();
          let side: string | null = null;
          if (/\b(both|bilateral)\b/.test(lv)) side = 'Both';
          else if (/\bleft\b/.test(lv)) side = 'Left';
          else if (/\bright\b/.test(lv)) side = 'Right';
          if (side) {
            parsedData.pathology_info.affected_side = side;
            console.log(`[AUTO-PARSE ENRICH] Extracted affected_side via regex (${proc}): ${side}`);
            if (proc === 'GAE' && !parsedData.pathology_info.affected_knee) {
              parsedData.pathology_info.affected_knee = side;
              console.log(`[AUTO-PARSE ENRICH] Mirrored affected_side to affected_knee: ${side}`);
            }
          }
        }
      }
    }
  }



  // === PAE w/BPH STEP-specific field extraction (deterministic regex on raw notes) ===
  // PAE intake uses "PAE w/BPH | <question>:" format that GPT often skips.
  if (/PAE w\/?\s*BPH\s*\||prostate|BPH/i.test(intakeNotes)) {
    if (!parsedData.pathology_info.primary_complaint) {
      parsedData.pathology_info.primary_complaint = 'PAE / BPH';
    }

    const grab = (re: RegExp): string | null => {
      const m = intakeNotes.match(re);
      return m && m[1] ? m[1].trim() : null;
    };

    // Symptoms experienced
    if (!parsedData.pathology_info.symptoms || /^(yes|no|☑️\s*yes|☐\s*no)$/i.test(String(parsedData.pathology_info.symptoms).trim())) {
      const sx = grab(/PAE w\/?\s*BPH\s*\|\s*(?:What|Which)[^:?]*symptom[^:?]*\??\s*:\s*([^\n]+)/i)
        || grab(/symptoms? (?:are you )?experiencing[^:?]*\??\s*:\s*([^\n]+)/i);
      if (sx && sx.length > 2) {
        parsedData.pathology_info.symptoms = sx;
        console.log(`[AUTO-PARSE PAE] Extracted symptoms: ${sx}`);
      }
    }

    // Duration
    if (!parsedData.pathology_info.duration) {
      const dur = grab(/PAE w\/?\s*BPH\s*\|[^|\n:]*(?:how long|duration)[^:?]*\??\s*:\s*([^\n]+)/i)
        || grab(/how long have you (?:had|been experiencing)[^:?]*\??\s*:\s*([^\n]+)/i);
      if (dur) {
        parsedData.pathology_info.duration = dur;
        console.log(`[AUTO-PARSE PAE] Extracted duration: ${dur}`);
      }
    }

    // Previous treatments
    if (!parsedData.pathology_info.previous_treatments) {
      const tx = grab(/PAE w\/?\s*BPH\s*\|[^|\n:]*(?:treatments?|medications?)[^:?]*\??\s*:\s*([^\n]+)/i)
        || grab(/what treatments? have you tried[^:?]*\??\s*:\s*([^\n]+)/i);
      if (tx && tx.length > 2) {
        parsedData.pathology_info.previous_treatments = tx;
        console.log(`[AUTO-PARSE PAE] Extracted previous_treatments: ${tx}`);
      }
    }

    // Urologist surgery recommended → diagnosis/notes
    const surg = grab(/urologist[^:?]*surger(?:y|ies)[^:?]*\??\s*:\s*([^\n]+)/i);
    if (surg && !parsedData.pathology_info.other_notes) {
      parsedData.pathology_info.other_notes = `Urologist surgery recommended: ${surg}`;
      console.log(`[AUTO-PARSE PAE] Extracted urologist surgery note: ${surg}`);
    }
  }

  // === ATE STEP-specific field extraction (deterministic regex on raw notes) ===
  // ATE intake uses "STEP 1 | Where is your pain located?" / "STEP 2 | Have you tried..." format.
  // Trigger when the calendar already detected ATE OR the notes mention Achilles/tendinitis.
  if (/\bATE\b|achilles|tendinitis|tendonitis/i.test(intakeNotes)) {
    const grab = (re: RegExp): string | null => {
      const m = intakeNotes.match(re);
      return m && m[1] ? m[1].trim() : null;
    };

    // Force procedure_type / primary_complaint / affected_area for ATE
    if (!parsedData.pathology_info.procedure_type || /^(GAE|UFE|PAE|HAE|PAD|FSE|TAE|PFE|Neuropathy)$/i.test(String(parsedData.pathology_info.procedure_type)) === false) {
      // already detected; leave alone
    }
    if (String(parsedData.pathology_info.procedure_type).toUpperCase() === 'ATE') {
      if (!parsedData.pathology_info.primary_complaint) {
        parsedData.pathology_info.primary_complaint = 'ATE Consultation';
      }

      // Where is your pain located? → pain_location + affected_area
      const loc = grab(/STEP\s*1\s*\|\s*Where is your pain located\??\s*:\s*([^\n]+)/i)
        || grab(/Where is your (?:Achilles\s+)?pain located\??\s*:\s*([^\n]+)/i);
      if (loc && loc.length > 1) {
        if (!parsedData.pathology_info.pain_location) {
          parsedData.pathology_info.pain_location = loc;
          console.log(`[AUTO-PARSE ATE] Extracted pain_location: ${loc}`);
        }
        if (!parsedData.pathology_info.affected_area || /achilles tendon/i.test(String(parsedData.pathology_info.affected_area || ''))) {
          parsedData.pathology_info.affected_area = loc;
          console.log(`[AUTO-PARSE ATE] Set affected_area from pain_location: ${loc}`);
        }
      }

      // Treatments tried for Achilles pain → previous_treatments
      if (!parsedData.pathology_info.previous_treatments) {
        const tx = grab(/STEP\s*2\s*\|\s*Have you tried any treatments for your Achilles pain[^:]*:\s*([^\n]+)/i)
          || grab(/treatments? for your Achilles pain[^:]*:\s*([^\n]+)/i);
        if (tx && tx.length > 2) {
          parsedData.pathology_info.previous_treatments = tx;
          console.log(`[AUTO-PARSE ATE] Extracted previous_treatments: ${tx}`);
        }
      }

      // Pain level fallback (in case AI missed)
      if (!parsedData.pathology_info.pain_level) {
        const pl = grab(/STEP\s*1\s*\|\s*How would you rate your pain[^:]*:\s*([^\n]+)/i);
        if (pl) {
          const num = pl.match(/\d+/);
          if (num) {
            parsedData.pathology_info.pain_level = num[0];
            console.log(`[AUTO-PARSE ATE] Extracted pain_level: ${num[0]}`);
          }
        }
      }
    }
  }

  return parsedData;
}

// Helper: Detect procedure type from a field key name (e.g., "GAE STEP 1 | Pain level" -> "GAE")
function detectProcedureFromFieldKey(key: string): string | null {
  const upperKey = key.toUpperCase();
  if (upperKey.includes('NEUROPATHY')) {
    return 'Neuropathy';
  }
  if (upperKey.includes('TAE') || upperKey.includes('THYROID')) {
    return 'TAE';
  }
  if (upperKey.includes('HAE') || upperKey.includes('HEMORRHOID')) {
    return 'HAE';
  }
  if (upperKey.includes('GAE') || (upperKey.includes('KNEE') && !upperKey.includes('UFE') && !upperKey.includes('PAE') && !upperKey.includes('PAD'))) {
    return 'GAE';
  }
  if (upperKey.includes('UFE') || upperKey.includes('FIBROID') || upperKey.includes('UTERINE')) {
    return 'UFE';
  }
  if (upperKey.includes('PAE') || upperKey.includes('PROSTATE')) {
    return 'PAE';
  }
  if (upperKey.includes('PFE') || upperKey.includes('PLANTAR')) {
    return 'PFE';
  }
  if (upperKey.includes('PAD') || upperKey.includes('PERIPHERAL')) {
    return 'PAD';
  }
  if (upperKey.includes('FSE') || upperKey.includes('FROZEN SHOULDER') || upperKey.includes('SHOULDER')) {
    return 'FSE';
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
      affected_knee: null as string | null,
      affected_side: null as string | null 
    },
    medical_info: { 
      medications: null as string | null, 
      allergies: null as string | null, 
      pcp_name: null as string | null,
      pcp_phone: null as string | null,
      urologist_name: null as string | null,
      urologist_phone: null as string | null,
      imaging_details: null as string | null,
      imaging_facility: null as string | null,
      imaging_phone: null as string | null,
      xray_details: null as string | null
    },
    insurance_card_url: null as string | null,
    insurance_card_back_url: null as string | null,
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
  const isTargetPAD = (targetProcedure || '').toString().toUpperCase() === 'PAD';
  
  for (const field of customFields) {
    const rawKey = customFieldDefs[field.id] || field.key || '';
    const key = rawKey.toLowerCase();
    const value = Array.isArray(field.field_value) ? field.field_value.join(', ') : field.field_value;
    if (!value) continue;

    // Filter pathology fields by procedure if targetProcedure is set
    const fieldProcedure = detectProcedureFromFieldKey(rawKey);
    const isPathologyField = key.includes('step') || key.includes('pain') || key.includes('symptom') || 
                             key.includes('complaint') || key.includes('pae') || key.includes('ufe') || 
                             key.includes('gae') || key.includes('knee') || key.includes('prostate') ||
                             key.includes('fibroid') || key.includes('uterine') || key.includes('pelvic') ||
                             key.includes('pad') || key.includes('peripheral') ||
                             key.includes('fse') || key.includes('shoulder') ||
                             key.includes('hae') || key.includes('hemorrhoid') || key.includes('rectal') || key.includes('bleeding');
    
    // Skip pathology fields from different procedures
    if (targetProcedure && fieldProcedure && fieldProcedure !== targetProcedure && isPathologyField) {
      console.log(`[AUTO-PARSE GHL] Skipping field "${rawKey}" (procedure ${fieldProcedure}) - current appointment is ${targetProcedure}`);
      continue;
    }
    
    // Track STEP fields for the target procedure (indicates structured GHL data)
    if (rawKey.toUpperCase().includes('STEP') && (!fieldProcedure || fieldProcedure === targetProcedure)) {
      stepFieldCount++;
      const valStr = String(value);
      const lowerVal = valStr.toLowerCase();
      // Normalize checkbox YES/NO answers
      const yesNo = (lowerVal.includes('☑️ yes') || lowerVal.startsWith('yes'))
        ? 'YES'
        : (lowerVal.includes('☐ no') || lowerVal.startsWith('no'))
          ? 'NO'
          : null;

      // OA / TKR diagnosis (GAE) — must come BEFORE generic pain/symptom matching
      if (key.includes('osteoarthritis') || key.includes(' tkr') || key.includes('tkr ') || (key.includes('diagnosed') && key.includes('knee'))) {
        if (yesNo) (result.pathology_info as any).oa_tkr_diagnosed = yesNo;
      }
      // Trauma / injury onset (GAE)
      else if (key.includes('trauma') || (key.includes('injury') && (key.includes('begin') || key.includes('onset') || key.includes('after')))) {
        if (yesNo) (result.pathology_info as any).trauma_related_onset = yesNo;
      }
      // Pain level / severity scale
      else if ((key.includes('scale') || key.includes('severe')) && key.includes('pain')) {
        const painMatch = valStr.match(/\d+/);
        if (painMatch) result.pathology_info.pain_level = painMatch[0];
      }
      // Symptoms description (explicit "describe" or "symptoms you")
      else if (key.includes('describe') && key.includes('symptom')) {
        result.pathology_info.symptoms = valStr;
      }
      else if (key.includes('symptoms you') || key.includes('symptoms_you')) {
        result.pathology_info.symptoms = valStr;
      }
      // Treatments tried
      else if (key.includes('treatment') || (key.includes('tried') && !key.includes('symptom'))) {
        (result.pathology_info as any).previous_treatments = valStr;
      }
      // Imaging - smart parse compound responses
      else if (key.includes('imaging') || key.includes('x-ray') || key.includes('xray') || key.includes('mri') || key.includes(' ct')) {
        const imgValue = valStr;
        if (lowerVal.startsWith('yes') || lowerVal.includes('☑️ yes')) {
          (result.pathology_info as any).imaging_done = 'YES';
        } else if (lowerVal.startsWith('no') || lowerVal.includes('☐ no')) {
          (result.pathology_info as any).imaging_done = 'NO';
        } else {
          (result.pathology_info as any).imaging_done = imgValue;
        }
        result.medical_info.imaging_details = imgValue;
        parseCompoundImagingResponse(imgValue, result);
      }
      // Duration / how long
      else if (key.includes('how long') || key.includes('how_long') || key.includes('duration')) {
        (result.pathology_info as any).duration = valStr;
      }
      // Age range (tightened: only "how old" or explicit "age range")
      else if (key.includes('how old') || key.includes('age range') || key.includes('age_range')) {
        (result.pathology_info as any).age_range = valStr;
      }
      // Frequency (fall-through symptom hint, not Yes/No)
      else if (key.includes('frequency')) {
        result.pathology_info.symptoms = result.pathology_info.symptoms
          ? `${result.pathology_info.symptoms} | ${valStr}`
          : valStr;
      }
    }

    // Insurance fields - distinguish real carrier from screening question.
    // Screening keys look like "Please select your GAE insurance provider" — used to bucket leads.
    // Real key is "Insurance Provider" / "insurance_provider". Real wins; screening only fills if real is empty.
    const isScreeningProvider = key.includes('insurance') && key.includes('provider') &&
      (key.includes('select') || key.includes('please') || /\byour\b/.test(key));
    const isRealProvider = key.includes('insurance') && key.includes('provider') && !isScreeningProvider;

    if (isRealProvider) {
      result.insurance_info.insurance_provider = value;
    } else if (isScreeningProvider) {
      if (!result.insurance_info.insurance_provider) {
        result.insurance_info.insurance_provider = value;
        console.log(`[AUTO-PARSE GHL] Using screening field "${rawKey}" as fallback insurance_provider`);
      }
    } else if (key.includes('insurance') && key.includes('plan')) {
      result.insurance_info.insurance_plan = value;
    } else if ((key.includes('member') && key.includes('id')) || key.includes('insurance_id')) {
      result.insurance_info.insurance_id_number = value;
    } else if (key.includes('group') || key.includes('grp')) {
      if (!isInvalidGroupNumber(value)) {
        result.insurance_info.insurance_group_number = value;
      } else {
        console.log(`[AUTO-PARSE GHL] Rejected invalid group_number from field "${rawKey}": ${value}`);
      }
    } else if (key.includes('insurance') && key.includes('note')) {
      result.insurance_info.insurance_notes = value;
    } else if ((key === 'notes' || key.startsWith('notes ') || key.startsWith('notes_') || key.startsWith('notes(')) && 
               !key.includes('conversation') && !result.insurance_info.insurance_notes) {
      result.insurance_info.insurance_notes = value;
      console.log(`[AUTO-PARSE GHL] Captured generic notes field "${rawKey}" as insurance_notes: ${value}`);
    }
    // Insurance card URL (front + back parsed from GHL upload JSON blob)
    else if ((key.includes('insurance') && key.includes('card')) || key.includes('upload')) {
      console.log(`[AUTO-PARSE GHL] Found potential insurance card field "${key}":`, typeof value, value?.substring?.(0, 100) || value);
      const fb = extractFrontBackFromJsonOrString(value);
      console.log(`[AUTO-PARSE GHL] Extracted front/back:`, fb);
      const isSecondary = key.includes('secondary') || /\(\s*2\s*\)/.test(key);
      if (isSecondary) {
        if (fb.front) result.insurance_info.secondary_card_front_url = fb.front;
        if (fb.front) result.insurance_info.secondary_card_url = fb.front; // legacy compat
        if (fb.back) result.insurance_info.secondary_card_back_url = fb.back;
      } else {
        if (fb.front) result.insurance_card_url = fb.front;
        if (fb.back) result.insurance_card_back_url = fb.back;
      }
    }

    // Pathology fields - expanded for Vivid Vascular PAE/UFE/GAE patterns
    else if (key.includes('complaint') || key.includes('reason') || key.includes('concern')) {
      result.pathology_info.primary_complaint = value;
    } else if (key.includes('symptom')) {
      result.pathology_info.symptoms = value;
    } else if (key.includes('pain') && key.includes('level')) {
      result.pathology_info.pain_level = value;
    }
    // Generic "Which side is affected..." question (applies to all procedures)
    else if ((key.includes('which side') || (key.includes('side') && key.includes('affected'))) && !key.includes('knee') && !key.includes('shoulder')) {
      const lv = value.toLowerCase();
      let side: string | null = null;
      if (lv.includes('both') || lv.includes('bilateral')) side = 'Both';
      else if (lv.includes('left')) side = 'Left';
      else if (lv.includes('right')) side = 'Right';
      if (side) {
        result.pathology_info.affected_side = side;
        // Mirror to affected_knee for GAE so the existing knee badge still works
        if ((result.pathology_info.procedure_type || '').toUpperCase() === 'GAE') {
          result.pathology_info.affected_knee = side;
        }
      }
    }
    else if (key.includes('affected') || key.includes('area') || key.includes('location')) {
      // Skip pure side answers so we don't pollute affected_area with 'Left'/'Right'/'Both'
      const trimmed = value.trim();
      if (!/^(left|right|both|bilateral)$/i.test(trimmed)) {
        result.pathology_info.affected_area = value;
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
    }
    // Specific knee side field
    else if (key.includes('knee') && (key.includes('which') || key.includes('affected') || key.includes('side'))) {
      const lowerValue = value.toLowerCase();
      let side: string | null = null;
      if (lowerValue.includes('both') || lowerValue.includes('bilateral')) side = 'Both';
      else if (lowerValue.includes('left')) side = 'Left';
      else if (lowerValue.includes('right')) side = 'Right';
      if (side) {
        result.pathology_info.affected_knee = side;
        if (!result.pathology_info.affected_side) result.pathology_info.affected_side = side;
      }
    }
    // Procedure/treatment preference fields (Vivid Vascular patterns)
    else if (key.includes('prefer') || key.includes('non-surgical') || key.includes('nonsurgical') || 
             key.includes('treatment') || key.includes('procedure') || key.includes('surgical')) {
      // Extract procedure type from key if present
      const procedureMatch = key.match(/\b(pae|ufe|gae|tae|hae|pad|fse|pfe)\b/i);
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
    // PAE/UFE/GAE/PAD specific fields
    else if (key.includes('pae') || key.includes('prostate')) {
      result.pathology_info.primary_complaint = 'PAE Consultation';
      result.pathology_info.affected_area = 'Prostate';
    } else if (key.includes('ufe') || key.includes('fibroid') || key.includes('uterine')) {
      result.pathology_info.primary_complaint = 'UFE Consultation';
      result.pathology_info.affected_area = 'Uterus';
    } else if (key.includes('gae') || key.includes('gastric') || (key.includes('artery') && key.includes('embolization'))) {
      result.pathology_info.primary_complaint = 'GAE Consultation';
      result.pathology_info.affected_area = 'Gastric';
    }
    // PAD-specific survey fields
    else if (key.includes('open wounds') || key.includes('open_wounds') || key.includes('sores')) {
      const lowerVal = String(value).toLowerCase();
      if (lowerVal.includes('yes') || lowerVal === '☑️ yes') {
        result.pathology_info.symptoms = result.pathology_info.symptoms 
          ? `${result.pathology_info.symptoms}, Open wounds or sores` : 'Open wounds or sores';
      }
    } else if (key.includes('pain to the toes') || key.includes('pain_to_the_toes') || key.includes('toe pain')) {
      result.pathology_info.primary_complaint = String(value);
    } else if (key.includes('vascular provider') || key.includes('vascular_provider') || key.includes('care of a vascular')) {
      (result.pathology_info as any).vascular_provider = String(value);
    } else if (key.includes('medical conditions') || key.includes('medical_conditions')) {
      (result.pathology_info as any).diagnosis = String(value);
    } else if (isTargetPAD && /\b(?:smoking\s+status|tobacco(?:\s+use)?|smoker|smoke)\b/i.test(rawKey)) {
      (result.medical_info as any).smoking_status = String(value);
    } else if (key.includes('numbness') || key.includes('cold feet') || key.includes('discoloration')) {
      const lowerVal = String(value).toLowerCase();
      if (lowerVal.includes('yes') || lowerVal === '☑️ yes') {
        result.pathology_info.symptoms = result.pathology_info.symptoms 
          ? `${result.pathology_info.symptoms}, Numbness/cold feet/discoloration` : 'Numbness/cold feet/discoloration';
      }
    } else if (key.includes('worse when walking') || key.includes('walking') && key.includes('rest')) {
      const lowerVal = String(value).toLowerCase();
      if (lowerVal.includes('yes') || lowerVal === '☑️ yes') {
        result.pathology_info.symptoms = result.pathology_info.symptoms 
          ? `${result.pathology_info.symptoms}, Gets worse when walking, improves with rest` : 'Gets worse when walking, improves with rest';
      }
    } else if ((key.includes('pad') && key.includes('circulation')) || key.includes('poor circulation')) {
      (result.pathology_info as any).pad_diagnosed = String(value);
    } else if (isTargetPAD && (key.includes('blood thinner') || key.includes('blood_thinner'))) {
      const lowerVal = String(value).toLowerCase();
      if (lowerVal.includes('yes') || lowerVal === '☑️ yes') {
        result.medical_info.medications = result.medical_info.medications 
          ? `${result.medical_info.medications}, Currently on blood thinners` : 'Currently on blood thinners';
        (result.medical_info as any).blood_thinners = 'YES';
      } else {
        (result.medical_info as any).blood_thinners = 'NO';
      }
    } else if (key.includes('age range') || key.includes('age_range')) {
      (result.pathology_info as any).age_range = String(value);
    }
    // FSE-specific survey fields
    else if (key.includes('shoulder') && (key.includes('which') || key.includes('affected') || key.includes('side'))) {
      (result.pathology_info as any).affected_shoulder = String(value);
    }
    else if (key.includes('difficulty') && (key.includes('movement') || key.includes('shoulder') || key.includes('raising') || key.includes('arm'))) {
      (result.pathology_info as any).difficulty_movement = String(value);
    }
    else if (key.includes('long-term') || key.includes('long_term') || key.includes('provide long')) {
      (result.pathology_info as any).long_term_relief = String(value);
    }
    else if (key.includes('worse') && (key.includes('night') || key.includes('lying'))) {
      (result.pathology_info as any).pain_worse_at_night = String(value);
    }
    else if (key.includes('diagnosed') && key.includes('following')) {
      (result.pathology_info as any).diagnosis = String(value);
    }
    // TAE-specific survey fields (Thyroid Artery Embolization)
    else if (key.includes('thyroid') || key.includes('goiter') || key.includes('tae')) {
      const lowerVal = String(value).toLowerCase();
      result.pathology_info.primary_complaint = 'TAE Consultation';
      (result.pathology_info as any).affected_area = 'Thyroid';
      if (key.includes('nodule') || key.includes('goiter')) {
        (result.pathology_info as any).diagnosis = String(value);
      } else if (key.includes('avoiding surgery') || key.includes('avoid surgery') || key.includes('minimally invasive')) {
        (result.pathology_info as any).notes = (result.pathology_info as any).notes
          ? `${(result.pathology_info as any).notes} | ${String(value)}` : String(value);
      } else if (key.includes('recommended') && (key.includes('surgery') || key.includes('following'))) {
        result.pathology_info.previous_treatments = result.pathology_info.previous_treatments
          ? `${result.pathology_info.previous_treatments}, ${String(value)}` : String(value);
      } else if (key.includes('experiencing') || key.includes('lump') || key.includes('swelling') || key.includes('neck')) {
        result.pathology_info.symptoms = result.pathology_info.symptoms
          ? `${result.pathology_info.symptoms}, ${String(value)}` : String(value);
      } else if (key.includes('imaging') && (key.includes('thyroid') || key.includes('ultrasound') || key.includes('ct') || key.includes('mri'))) {
        if (lowerVal.includes('yes')) {
          result.pathology_info.imaging_done = 'YES';
        } else if (lowerVal.includes('no')) {
          result.pathology_info.imaging_done = 'NO';
        }
      } else if (key.includes('cosmetic')) {
        (result.pathology_info as any).notes = (result.pathology_info as any).notes
          ? `${(result.pathology_info as any).notes} | Cosmetic concerns: ${String(value)}` : `Cosmetic concerns: ${String(value)}`;
      }
    }
    // HAE-specific survey fields
    else if (key.includes('hemorrhoid') || (key.includes('rectal') && key.includes('bleeding'))) {
      result.pathology_info.primary_complaint = result.pathology_info.primary_complaint 
        ? `${result.pathology_info.primary_complaint}, ${String(value)}` : String(value);
    }
    else if (key.includes('bowel') || key.includes('constipation')) {
      result.pathology_info.symptoms = result.pathology_info.symptoms 
        ? `${result.pathology_info.symptoms}, ${String(value)}` : String(value);
    }
    else if (key.includes('colonoscopy')) {
      const lowerVal = String(value).toLowerCase();
      if (lowerVal.includes('yes') || lowerVal === '☑️ yes') {
        result.pathology_info.imaging_done = 'YES';
        result.medical_info.imaging_details = result.medical_info.imaging_details 
          ? `${result.medical_info.imaging_details}, Colonoscopy performed` : 'Colonoscopy performed';
      } else {
        result.pathology_info.imaging_done = result.pathology_info.imaging_done || 'NO';
      }
    }
    else if (key.includes('rectal') && !key.includes('bleeding')) {
      result.pathology_info.symptoms = result.pathology_info.symptoms 
        ? `${result.pathology_info.symptoms}, ${String(value)}` : String(value);
    }
    // Medical fields
    else if (key.includes('medication')) {
      result.medical_info.medications = value;
    } else if (key.includes('allerg')) {
      result.medical_info.allergies = value;
    } else if (key.includes('pcp') || key.includes('doctor') || key.includes('physician') || key.includes('primary care')) {
      // PCP/Primary Care fields - handle separate phone fields vs combined values
      const value_str = String(value);
      const isPhoneField = key.includes('phone') || key.includes('number') || key.includes('tel');

      if (isPhoneField) {
        result.medical_info.pcp_phone = value_str;
        console.log(`[AUTO-PARSE GHL] Extracted PCP phone from "${key}": "${value_str}"`);
      } else {
        // Try to extract phone number embedded in name field (e.g. "Jones 214-555-5555")
        const phonePatterns = [
          /(\d{3}-\d{3}-\d{4})/,
          /(\(\d{3}\)\s*\d{3}-\d{4})/,
          /(\d{10,})/
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
          if (!result.medical_info.pcp_phone) result.medical_info.pcp_phone = phone;
          console.log(`[AUTO-PARSE GHL] Extracted PCP from "${key}": name="${result.medical_info.pcp_name}", phone="${phone}"`);
        } else {
          result.medical_info.pcp_name = value_str;
          console.log(`[AUTO-PARSE GHL] Extracted PCP name from "${key}": "${value_str}" (no phone found)`);
        }
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
    // Imaging facility / location fields
    else if ((key.includes('imaging') && (key.includes('facility') || key.includes('location') || key.includes('where'))) ||
             (key.includes('where') && key.includes('imaging'))) {
      const value_str = String(value);
      // Try to extract phone from combined value
      const phoneMatch = value_str.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
      if (phoneMatch) {
        result.medical_info.imaging_phone = phoneMatch[1];
        result.medical_info.imaging_facility = value_str.replace(phoneMatch[1], '').replace(/^\s*[-,]\s*|\s*[-,]\s*$/g, '').trim() || value_str;
      } else {
        result.medical_info.imaging_facility = value_str;
      }
      console.log(`[AUTO-PARSE GHL] Extracted imaging facility from "${key}": "${result.medical_info.imaging_facility}"`);
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
        // Guard against GHL bot prompts stored in imaging fields
        if (valueStr.length > 200 || /booking|consultation|schedule|challenger/i.test(valueStr)) {
          console.log(`[AUTO-PARSE GHL] Skipping bot prompt in imaging field: ${valueStr.substring(0, 50)}...`);
          if (!result.medical_info.imaging_details) {
            result.medical_info.imaging_details = 'Patient has had previous imaging';
          }
        } else {
          result.medical_info.imaging_details = valueStr;
        }
        console.log(`[AUTO-PARSE GHL] Extracted 'Had Imaging Before' field: ${valueStr.substring(0, 100)}`);
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
  
  // Neuropathy must be checked BEFORE GAE/knee — Neuropathy intakes often
  // share knee-numbness symptoms that would otherwise fall through to GAE.
  if (name.includes('neuropathy')) {
    return 'Neuropathy';
  }
  if (name.includes('tae') || name.includes('thyroid')) {
    return 'TAE';
  }
  if (name.includes('ufe') || name.includes('fibroid') || name.includes('uterine')) {
    return 'UFE';
  }
  if (name.includes('pae') || name.includes('prostate')) {
    return 'PAE';
  }
  if (name.includes('hae') || name.includes('hemorrhoid artery')) {
    return 'HAE';
  }
  if (name.includes('gae') || name.includes('knee') || name.includes('osteoarthritis')) {
    return 'GAE';
  }
  if (name.includes('pfe') || name.includes('plantar')) {
    return 'PFE';
  }
  if (name.includes('pad') || name.includes('peripheral')) {
    return 'PAD';
  }
  if (name.includes('fse') || name.includes('frozen shoulder')) {
    return 'FSE';
  }
  // ATE — Achilles Tendinitis Embolization. Match word-boundary "ate" to avoid
  // false positives on words like "private" or "rate".
  if (/\bate\b/i.test(calendarName) || name.includes('achilles') || name.includes('tendinitis') || name.includes('tendonitis')) {
    return 'ATE';
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

Deno.serve(async (req) => {
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

        // Project-level procedure constraint (e.g., Ventra Medical only offers UFE & HAE)
        const projectName = (record.project_name || '').toLowerCase();
        const isVentra = /ventra/.test(projectName);
        const allowedProcedures: string[] | null = isVentra ? ['UFE', 'HAE'] : null;

        // Sniff intake notes for procedure when calendar didn't yield one,
        // or when the calendar-detected procedure violates the project constraint.
        const sniffProcedureFromNotes = (notes: string | null | undefined, allowed: string[] | null): string | null => {
          if (!notes) return null;
          const upper = notes.toUpperCase();
          const candidates: Array<[string, RegExp]> = [
            ['UFE', /UFE STEP|PATHOLOGY\s*\(UFE\)|UTERINE FIBROID|FIBROID/],
            ['HAE', /HAE STEP|PATHOLOGY\s*\(HAE\)|HEMORRHOID/],
            ['PAE', /PAE STEP|PATHOLOGY\s*\(PAE\)|PROSTATIC ARTERY/],
            ['GAE', /GAE STEP|PATHOLOGY\s*\(GAE\)|GENICULAR ARTERY/],
            ['PFE', /PFE STEP|PLANTAR FASCIITIS/],
            ['PAD', /PAD STEP|PERIPHERAL ARTERY/],
            ['FSE', /FSE STEP|FROZEN SHOULDER/],
            ['TAE', /TAE STEP|THYROID ARTERY/],
          ];
          for (const [proc, rx] of candidates) {
            if (allowed && !allowed.includes(proc)) continue;
            if (rx.test(upper)) return proc;
          }
          return null;
        };

        if (allowedProcedures) {
          const sniffed = sniffProcedureFromNotes(record.patient_intake_notes, allowedProcedures);
          if (!calendarProcedure || !allowedProcedures.includes(calendarProcedure)) {
            const constrained = sniffed || allowedProcedures[0];
            if (calendarProcedure && calendarProcedure !== constrained) {
              console.log(`[AUTO-PARSE] Project "${record.project_name}" only offers ${allowedProcedures.join('/')} — overriding calendar procedure ${calendarProcedure} → ${constrained}`);
            } else {
              console.log(`[AUTO-PARSE] Project "${record.project_name}" only offers ${allowedProcedures.join('/')} — using ${constrained} (sniffed=${sniffed || 'none'})`);
            }
            calendarProcedure = constrained;
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
    "insurance_provider": "string or null - The carrier/company name (e.g., 'PHYSICIAN MUTUAL', 'Aetna', 'BCBS'). Never copy plan names here.",
    "insurance_plan": "string or null - The plan/product name from the card or GHL 'Insurance Plan' field (e.g., 'Medicare Supplement Plan G', 'PPO', 'HMO Gold'). NEVER copy the provider/carrier name into this field.",
    "insurance_id_number": "string or null",
    "insurance_group_number": "string or null - ONLY the alphanumeric group/plan number printed on the insurance card. Must be a short identifier. NEVER copy conversation summaries, appointment statuses, dates, words like 'scheduled', 'unknown', 'missing', or anything containing 'Insurance Type:' / 'Appointment Status:' / 'Appointment Details:'. Return null if not explicitly labeled as a group number.",
    "insurance_notes": "string or null - Any additional notes from the intake form, including fields labeled 'Notes', 'Notes (Example: Imaging, Secondary, etc.)', secondary insurance info, VA coverage, Medicaid/Medicare notes, or clinical observations documented by the caller. Always extract any generic 'Notes' field value here."
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
    "procedure_type": "string or null - The pathology/service type. Allowed values: GAE, PAE, UFE, HAE, PAD, FSE, TAE, PFE, Neuropathy. This is NOT the patient complaint.",
    "primary_complaint": "string or null - The patient's chief complaint (e.g., 'knee pain', 'hip pain'), NOT the pathology type.",
    "symptoms": "string or null",
    "pain_level": "string or null",
    "affected_area": "string or null",
    "pain_location": "string or null - Verbatim answer to 'Where is your pain located?' for ATE intakes (e.g., 'Middle of the Achilles tendon', 'Insertion', 'Mid-tendon').",
    "affected_knee": "string or null - Which knee is affected: 'Left', 'Right', or 'Both'. Extract from any mention of specific knee side, bilateral, or left/right knee references.",
    "affected_side": "string or null - 'Left', 'Right', or 'Both'. Extract from any 'Which side is affected by the condition you are seeking treatment for?' question. Applies to all procedures (knees, shoulders, feet, etc.). Bilateral maps to 'Both'.",
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
${calendarProcedure === 'PAE' ? 'PAE (Prostatic Artery Embolization) focuses on: urinary frequency, weak urinary stream, incomplete bladder emptying, nocturia, prostate-related symptoms. Set procedure_type to "PAE". IMPORTANT: PAE intake questions are prefixed "PAE w/BPH | <question>:" — extract those answers into symptoms, duration, previous_treatments, and primary_complaint. Also handle "<PROC> STEP N | <question>:" and "<PROC> w/<SUB> | <question>:" patterns generically.' : ''}
${calendarProcedure === 'GAE' ? 'GAE (Genicular Artery Embolization) focuses on: knee pain, osteoarthritis, joint stiffness, swelling, joint instability, knee-related symptoms. Set procedure_type to "GAE".' : ''}
${calendarProcedure === 'PFE' ? 'PFE (Plantar Fasciitis Embolization) focuses on: heel pain, plantar fasciitis, sharp pain in the bottom of the heel, foot pain that worsens with first steps in the morning, pain that improves with rest. Set procedure_type to "PFE".' : ''}
${calendarProcedure === 'PAD' ? 'PAD (Peripheral Artery Disease) focuses on: poor circulation, numbness, cold feet, discoloration, open wounds/sores, toe pain, pain that worsens when walking and improves with rest, blood thinners, smoking/tobacco status, medical conditions (diabetes, hypertension, kidney disease). Set procedure_type to "PAD". Map medical conditions to "diagnosis".' : ''}
${calendarProcedure === 'FSE' ? 'FSE (Frozen Shoulder Embolization) focuses on: shoulder pain, frozen shoulder, limited range of motion, shoulder stiffness, difficulty raising arm, affected shoulder (left/right). Set procedure_type to "FSE".' : ''}
${calendarProcedure === 'HAE' ? 'HAE (Hemorrhoid Artery Embolization) focuses on: rectal bleeding, internal/external hemorrhoids, bowel discomfort, constipation, colonoscopy results, hemorrhoid diagnosis, bleeding duration. Set procedure_type to "HAE".' : ''}
${calendarProcedure === 'TAE' ? 'TAE (Thyroid Artery Embolization) focuses on: thyroid nodule or goiter diagnosis, lump or swelling in the neck, pressure or tightness in the throat, difficulty swallowing, cosmetic concerns about the neck, prior thyroid imaging (ultrasound/CT/MRI), interest in avoiding surgery, openness to minimally invasive treatment. Set procedure_type to "TAE", primary_complaint to "TAE Consultation", and affected_area to "Thyroid". Map "TAE STEP 1/2 | Are you experiencing any of the following?" to symptoms; "diagnosed with a thyroid nodule or goiter" to diagnosis; "Has a doctor recommended..." to previous_treatments; "imaging of your thyroid" to imaging_done (YES/NO); "Had Imaging Before" to medical_info.imaging_details.' : ''}
${calendarProcedure === 'Neuropathy' ? 'Neuropathy (peripheral neuropathy consultation, The Painless Center) focuses on: numbness, tingling, burning, cold feet, balance issues, foot/leg nerve pain, diabetic neuropathy, duration of symptoms. Set procedure_type to "Neuropathy". DO NOT extract knee-specific GAE fields like oa_tkr_diagnosed, affected_knee, or knee imaging — leave them null. primary_complaint should be "Neuropathy" or the described nerve symptom.' : ''}
${calendarProcedure === 'ATE' ? 'ATE (Achilles Tendinitis Embolization) focuses on: chronic Achilles tendon pain, location of pain along the Achilles tendon (insertion, mid-tendon, etc.), pain level, duration of symptoms, prior treatments tried (rest, PT, injections, orthotics), prior imaging (X-ray, MRI, ultrasound). Set procedure_type to "ATE", primary_complaint to "ATE Consultation", and affected_area to "Achilles tendon". Map "STEP 1 | How would you rate your pain on a scale of 0–10?" to pain_level; "STEP 1 | Where is your pain located?" to BOTH pathology_info.pain_location (the verbatim answer, e.g. "Middle of the Achilles tendon") AND affected_area; any "How long have you had..." answers to duration; "STEP 2 | Have you tried any treatments for your Achilles pain?" answers (and any other prior treatment lists) to previous_treatments — preserve the comma-separated list verbatim. DO NOT extract knee-specific GAE fields (oa_tkr_diagnosed, affected_knee) — leave them null.' : ''}

IGNORE any intake data from prior consultations for different procedures. Focus on ${calendarProcedure} data only.
`;
        }

        const sanitizedNotesForAI = stripPatientIntakeSummary(record.patient_intake_notes || '');
        const userPrompt = `${procedureContext}Patient Intake Notes:\n\n${sanitizedNotesForAI}`;

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
          console.log(`[AUTO-PARSE] GHL insurance_notes: ${ghlData.insurance_info?.insurance_notes || 'null'}`);
          console.log(`[AUTO-PARSE] AI insurance_notes: ${parsedData.insurance_info?.insurance_notes || 'null'}`);
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

        // Calendar-derived procedure is the source of truth — always override,
        // even when GHL data wasn't fetched or AI fallback set a wrong value.
        if (calendarProcedure) {
          if (!parsedData.pathology_info) parsedData.pathology_info = {};
          if (parsedData.pathology_info.procedure_type !== calendarProcedure) {
            console.log(`[AUTO-PARSE] Calendar override: procedure_type ${parsedData.pathology_info.procedure_type || 'null'} → ${calendarProcedure}`);
            parsedData.pathology_info.procedure_type = calendarProcedure;
          }
          // For Neuropathy specifically: clear GAE-only fields that the regex
          // fallback / GHL STEP extractor may have populated from prior knee data.
          if (calendarProcedure === 'Neuropathy') {
            parsedData.pathology_info.oa_tkr_diagnosed = null;
            parsedData.pathology_info.affected_knee = null;
            parsedData.pathology_info.trauma_related_onset = null;
          }
        }




        // Enforce project-level procedure constraint after AI parse
        if (allowedProcedures && parsedData?.pathology_info) {
          const current = parsedData.pathology_info.procedure_type;
          if (!current || !allowedProcedures.includes(current)) {
            const fallback = calendarProcedure && allowedProcedures.includes(calendarProcedure)
              ? calendarProcedure
              : allowedProcedures[0];
            console.log(`[AUTO-PARSE] Enforcing project constraint for "${record.project_name}": ${current || 'null'} → ${fallback}`);
            parsedData.pathology_info.procedure_type = fallback;
          }
        }

        // Post-AI enrichment: Always run regex extraction for critical fields
        // This catches anything the AI parser might have missed
        parsedData = enrichWithCriticalFields(parsedData, record.patient_intake_notes);

        // Sanitize symptoms field to strip leaked AI bot prompt instructions
        // (See: GHL custom field bot prompts leaking into intake payload)
        if (parsedData.pathology_info?.symptoms) {
          const sym = String(parsedData.pathology_info.symptoms);
          const isBotPrompt =
            sym.length > 400 ||
            /Reference this data|Booking Rule|Booking Step|Challenger Sale|Natural Language Suggestions|Preferred Times:/i.test(sym);
          if (isBotPrompt) {
            console.log(`[AUTO-PARSE SANITIZE] Stripped bot prompt from symptoms: ${sym.substring(0, 80)}...`);
            parsedData.pathology_info.symptoms = null;
          }
        }

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

          // Strip stale STEP question lines from prior services (e.g. GAE → UFE re-opt-in)
          // so the raw intake notes view doesn't show leftover funnel answers from the
          // wrong procedure.
          {
            const currentProc = parsedData.pathology_info?.procedure_type;
            const cleanedNotes = stripStaleStepLines(record.patient_intake_notes, currentProc);
            if (cleanedNotes && cleanedNotes !== record.patient_intake_notes) {
              updateData.patient_intake_notes = cleanedNotes;
            }
          }

          // Sync DOB to main column if we have one
          if (finalDob) {
            updateData.dob = finalDob;
          }

          // Sync insurance info to main columns. Always set explicitly (even to null)
          // so stale corrupted values don't linger after a re-parse.
          {
            const provider = parsedData.insurance_info?.insurance_provider;
            const plan = parsedData.insurance_info?.insurance_plan;
            const memberId = parsedData.insurance_info?.insurance_id_number;
            if (isInvalidInsuranceValue(provider)) {
              console.log(`[AUTO-PARSE SANITIZE] Rejecting corrupted insurance_provider: ${String(provider).substring(0, 60)}...`);
              parsedData.insurance_info.insurance_provider = null;
            }
            if (isInvalidInsuranceValue(plan)) {
              console.log(`[AUTO-PARSE SANITIZE] Rejecting corrupted insurance_plan: ${String(plan).substring(0, 60)}...`);
              parsedData.insurance_info.insurance_plan = null;
            }
            // If plan was wiped but provider is valid, mirror provider into plan so the
            // portal's Plan field isn't blank when the intake form only captured one name.
            if (!parsedData.insurance_info.insurance_plan && parsedData.insurance_info.insurance_provider) {
              parsedData.insurance_info.insurance_plan = parsedData.insurance_info.insurance_provider;
            }
            // Member IDs are validated with a dedicated rule: reject obvious
            // garbage (corrupted GHL prompt fragments, blob slurps >80 chars)
            // but allow all-numeric IDs like "350244934014".
            if (memberId) {
              const m = String(memberId).trim();
              const looksCorrupted =
                m.length > 80 ||
                /(GAE Info|PFE Info|UFE Info|PAE Info|HAE Info|PAD Info|FSE Info|TAE Info)/i.test(m) ||
                /(Insurance Phone:|Group Number:|Upload Card:|Insurance Notes:|Insurance Plan:|Insurance ID:)/i.test(m) ||
                m.length < 3;
              if (looksCorrupted) {
                console.log(`[AUTO-PARSE SANITIZE] Rejecting corrupted insurance_id: ${m.substring(0, 60)}...`);
                parsedData.insurance_info.insurance_id_number = null;
              }
            }
            updateData.detected_insurance_provider = parsedData.insurance_info?.insurance_provider || null;
            updateData.detected_insurance_plan = parsedData.insurance_info?.insurance_plan || null;
            updateData.detected_insurance_id = parsedData.insurance_info?.insurance_id_number || null;
          }
          
          // Update insurance_id_link / insurance_back_link with fallback chain:
          // 1. GHL custom field URL (highest priority) — includes front + back
          // 2. Extract from patient_intake_notes text (front only fallback)
          if (ghlData?.insurance_card_url) {
            updateData.insurance_id_link = ghlData.insurance_card_url;
            console.log(`[AUTO-PARSE] Setting insurance_id_link from GHL: ${ghlData.insurance_card_url}`);
          } else {
            // Fallback: extract front URL from "Upload A Copy Of Your Insurance Card (Primary)" JSON blob,
            // then from any URL in the intake notes.
            const intake = record.patient_intake_notes || '';
            const primaryBlob = intake.match(/Upload A Copy Of Your Insurance Card\s*\(Primary\)\s*:\s*(\{[^\n]+\})/i);
            if (primaryBlob && primaryBlob[1]) {
              const fb = extractFrontBackFromJsonOrString(primaryBlob[1]);
              if (fb.front) {
                updateData.insurance_id_link = fb.front;
                console.log(`[AUTO-PARSE] Setting insurance_id_link from intake (Primary) blob: ${fb.front}`);
              }
              if (fb.back) {
                updateData.insurance_back_link = fb.back;
                console.log(`[AUTO-PARSE] Setting insurance_back_link from intake (Primary) blob: ${fb.back}`);
              }
            } else {
              const extractedUrl = extractInsuranceUrlFromText(intake);
              if (extractedUrl) {
                updateData.insurance_id_link = extractedUrl;
                console.log(`[AUTO-PARSE] Setting insurance_id_link from intake notes: ${extractedUrl}`);
              }
            }
          }

          // Primary back URL from GHL custom field (when available)
          if (ghlData?.insurance_card_back_url) {
            updateData.insurance_back_link = ghlData.insurance_card_back_url;
            console.log(`[AUTO-PARSE] Setting insurance_back_link from GHL: ${ghlData.insurance_card_back_url}`);
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
            if (!isInvalidGroupNumber(parsedData.insurance_info.insurance_group_number)) {
              updateData.group_number = parsedData.insurance_info.insurance_group_number;
            } else {
              console.log(`[AUTO-PARSE] Rejected invalid AI group_number: ${parsedData.insurance_info.insurance_group_number}`);
              parsedData.insurance_info.insurance_group_number = null;
            }
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
