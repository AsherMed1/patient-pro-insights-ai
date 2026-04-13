

## Fix: Imaging Data Capture, Parsing, and Display

### Problem
1. The label "Had Imaging Before?" needs to be replaced with clearer wording
2. When a patient enters a detailed imaging response (e.g., "Yes, x-ray last year January 2025 at Presbyterian Hospital"), the system stores it as a single string but doesn't extract the imaging type, location, or timeframe
3. Imaging fields are scattered between the pathology section and medical section — they need to be consolidated under "Medical & PCP Information"

### Changes

**File 1: `src/components/appointments/ParsedIntakeInfo.tsx` (UI)**
- Rename "Had Imaging Before" label to "Imaging Details"
- Move "Imaging Done" (yes/no badge), "Imaging Type", and "Had Imaging Before" (now "Imaging Details") from the pathology section (lines 808-827) into the Medical & PCP Information section, grouped under the existing "Imaging Information" sub-header (near line 1143)
- Add new display rows for `imaging_location` and `imaging_when` fields in the Medical & PCP section
- Add editable fields for `imaging_location` and `imaging_when` in the edit form (near line 1068)

**File 2: `supabase/functions/auto-parse-intake-notes/index.ts` (Parsing)**
- Add `imaging_location` and `imaging_when` to the `medical_info` structure
- Enhance the imaging regex extraction (lines 265-286) to parse compound responses like "Yes, x-ray last year January 2025 at Presbyterian Hospital" into:
  - `imaging_done`: YES
  - `imaging_type`: X-ray (extract MRI, CT, ultrasound, x-ray keywords)
  - `imaging_location`: Presbyterian Hospital (extract text after "at" or "from")
  - `imaging_when`: January 2025 / last year (extract date/timeframe references)
- Add the same smart parsing to the enrichment function (lines 537-563)
- In the GHL custom field handler (line 872), when an imaging field is found, run the same compound parser instead of dumping the raw string into `imaging_done`

**File 3: `supabase/functions/ghl-webhook-handler/index.ts` (Webhook)**
- Update the GHL field categorizer (line 504) to ensure imaging-related fields with detailed responses are routed to the medical section with the new field naming so the auto-parser can extract them properly

### How it works after the fix
Patient enters: "Yes, x-ray last year January 2025 at Presbyterian Hospital"

Portal displays under **Medical & PCP Information → Imaging Information**:
- **Imaging Done:** YES
- **Imaging Type:** X-ray
- **Imaging Location:** Presbyterian Hospital
- **Imaging When:** January 2025
- **Imaging Facility:** (editable)
- **Facility Phone:** (editable)

### Summary
| Change | File | What |
|--------|------|------|
| Consolidate imaging display | ParsedIntakeInfo.tsx | Move imaging fields to Medical & PCP section, add location/when rows |
| Smart parsing of compound responses | auto-parse-intake-notes/index.ts | Extract type, location, timeframe from free-text imaging answers |
| GHL field routing | ghl-webhook-handler/index.ts | Ensure imaging data reaches the parser correctly |

