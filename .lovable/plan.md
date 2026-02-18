

# Add PAD Procedure Support to Auto-Parser and Medical Information Display

## Problem
The PAD (Peripheral Artery Disease) survey fields from GHL intake forms are not being fully extracted into the Medical Information section. The system currently supports GAE, UFE, PAE, and PFE procedures but does not recognize "PAD" as a procedure type. This means PAD-specific survey data (medical conditions, smoking status, blood thinners, open wounds, numbness, circulation issues) is either missed or only partially captured by the AI.

## Changes

### 1. Add PAD to Procedure Detection Functions
**File: `supabase/functions/auto-parse-intake-notes/index.ts`**

- Add PAD detection to `detectProcedureFromFieldKey()` -- match keys containing "PAD" or "peripheral"
- Add PAD detection to `detectProcedureFromCalendar()` -- match calendar names containing "pad" or "peripheral"
- Mark PAD STEP fields as pathology fields in the `isPathologyField` check (add `key.includes('pad')` and `key.includes('peripheral')`)

### 2. Extract PAD-Specific Survey Data from GHL Custom Fields
**File: `supabase/functions/auto-parse-intake-notes/index.ts`**

Add extraction logic in `extractDataFromGHLFields()` for PAD survey questions:

| GHL Field | Maps To |
|-----------|---------|
| "Open Wounds Or Sores" | `pathology_info.symptoms` (append) |
| "Pain To The Toes" | `pathology_info.primary_complaint` |
| "Under The Care Of A Vascular Provider" | `pathology_info.other_notes` |
| "Medical Conditions" (Diabetes, Hypertension, etc.) | `pathology_info.diagnosis` |
| "Smoke Or Use Tobacco" | `medical_info.smoking_status` (new field) |
| "Age Range" | `pathology_info.age_range` |
| "Numbness, Cold Feet, Or Discoloration" | `pathology_info.symptoms` (append) |
| "Gets Worse When Walking And Improve With Rest" | `pathology_info.symptoms` (append) |
| "PAD Or Poor Circulation" | `pathology_info.oa_tkr_diagnosed` repurposed or new field `pathology_info.pad_diagnosed` |
| "Blood Thinners" | `medical_info.medications` (append "Currently on blood thinners") |

### 3. Add PAD-Specific Display Fields to the UI
**File: `src/components/appointments/ParsedIntakeInfo.tsx`**

Add display rows in the Medical Information card for PAD-specific fields:
- **Medical Conditions / Diagnosis** -- already displayed
- **Smoking Status** -- new row showing "Never", "Former", or "Current"
- **PAD Diagnosed** -- new row with YES/NO badge
- **Blood Thinners** -- new row with YES/NO badge
- **Vascular Provider** -- new row with YES/NO badge

These fields will only render if data is present (using the existing `formatValue()` guard pattern), so they will not affect other procedure types.

### 4. Add PAD to Fallback Regex Parser
**File: `supabase/functions/auto-parse-intake-notes/index.ts`**

In `fallbackRegexParsing()`, add PAD keyword detection:
- If notes contain "PAD" or "peripheral artery" or "poor circulation", set `procedure_type` to "PAD"
- Add regex patterns for PAD-specific fields in the raw intake notes text

### 5. Deploy Updated Edge Function
Deploy the updated `auto-parse-intake-notes` function so new and re-parsed PAD appointments extract the full survey data.

## Technical Details

The new fields (`smoking_status`, `pad_diagnosed`, `blood_thinners`, `vascular_provider`) will be stored within the existing `parsed_pathology_info` and `parsed_medical_info` JSONB columns -- no database migration needed.

The `isPathologyField` filter (line ~657) needs `key.includes('pad')` added so PAD STEP fields are not skipped by the procedure filter.

Existing appointments for TVI PAD patients will need a reparse (via the existing "Reparse" button or the `reparse-specific-appointments` utility) to populate the new fields.

