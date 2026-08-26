# Fix Prospero PAE intake transfer and insurance-card persistence

## Goal

Make patient-submitted Prospero PAE intake data transfer consistently from Funnel/GHL into the Review Queue and Portal:

- PCP/doctor name and phone appear when submitted.
- PAE medical/survey answers appear in the Medical Information section.
- Primary and secondary insurance-card front/back images stay distinct.
- Re-parsing never duplicates, swaps, or removes existing card images.

## Plan

### 1. Confirm the affected Prospero test record

Locate the exact Prospero PAE test row and compare:

- raw `patient_intake_notes`
- top-level `insurance_id_link` / `insurance_back_link`
- `parsed_medical_info`
- `parsed_pathology_info`
- `parsed_insurance_info`
- related GHL contact custom-field file values

This verifies whether the missing data is absent from ingestion, lost during re-parse, or present but not rendered.

### 2. Harden PCP/doctor extraction

Update the parser to recognize more Prospero/PAE label variants, including:

- `Primary Care Doctor's Name`
- `Primary Care Doctor’s Name`
- `Doctor Name`
- `Primary Physician`
- paired or combined name/phone lines

The parser should keep existing non-empty PCP fields unless the incoming value is clearly valid, so re-processing cannot blank out a previously captured doctor.

### 3. Add deterministic PAE survey mapping

Extend the PAE extraction path to map common urinary/BPH survey answers into `parsed_pathology_info`, including:

- symptom list
- urination frequency
- weak stream / stream control
- quality-of-life impact
- UTI/bladder/kidney-health questions
- non-surgical treatment preference
- duration and prior treatments

These fields will supplement the AI output so Review Queue reviewers are not dependent on the model catching every question-label variant.

### 4. Make insurance-card parsing slot-aware

Replace single-URL extraction in the re-parser with multi-file collection that understands GHL upload shapes:

- plain URL strings
- JSON strings
- object maps keyed by file ID
- arrays of uploaded files
- comma/newline-separated URL lists

Assign cards by filename first (`front` / `back`), then by order. Deduplicate exact URLs so one file never fills both front and back.

### 5. Protect existing card slots during re-parse

Change `auto-parse-intake-notes` so parsed notes can only fill missing card slots and never overwrite an existing slot with null, a duplicate URL, or a lower-confidence single merge-tag URL.

Ownership rules:

- webhook/GHL upload fields are highest confidence
- manual portal uploads remain protected
- text-extracted merge-tag URLs are fallback only
- secondary card URLs remain inside `parsed_insurance_info`
- primary card URLs remain in top-level `insurance_id_link` / `insurance_back_link`

### 6. Render PAE survey fields in the Portal

Update `ParsedIntakeInfo` to display the new PAE-specific fields under Medical Information when the procedure is PAE, instead of hiding them inside raw notes.

Keep the current generic medical rows, but add clear PAE rows for urinary frequency, weak stream, quality-of-life impact, bladder/kidney issues, and non-surgical preference.

### 7. Re-test end-to-end

After the code changes:

1. Run the parser on the affected Prospero test record.
2. Verify PCP/medical/PAE fields persist in the database.
3. Verify insurance-card URLs remain distinct after a second re-parse.
4. Verify the Review Queue / Portal displays the fields and correct card buttons.
5. Deploy the affected Edge Function updates.

## Technical notes

- Main backend file: `supabase/functions/auto-parse-intake-notes/index.ts`
- Possible webhook touchpoint: `supabase/functions/ghl-webhook-handler/index.ts`, only if contact-field ingestion is also missing the data before parsing.
- UI file: `src/components/appointments/ParsedIntakeInfo.tsx`
- No database migration is expected unless the existing JSON fields cannot represent one of the required PAE answers.
