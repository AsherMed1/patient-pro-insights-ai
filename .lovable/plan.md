

## Fix: NGV TEST PAD Appointment — Duplicate and Incorrect Data Display

### Problems Identified

1. **Duplicate "Imaging Done" and "Age Range" rows**: The Medical Information section in `ParsedIntakeInfo.tsx` renders these fields **twice** — once in the generic block (lines 774-778 for age_range, lines 808-814 for imaging_done) and again in the PAD-specific block (lines 903-907 for age_range, lines 895-901 for imaging_done).

2. **"Other" field shows vascular/blood thinner/smoking questions**: The `other_notes` field in `parsed_pathology_info` contains `"Never smoked or used tobacco products"` — the AI parser is extracting the smoking question answer into `other_notes` instead of only populating `smoking_status` in `medical_info`. The vascular provider and blood thinner questions are also showing in the "Other" row because the AI extracts them as Q&A text into `other_notes`.

3. **Imaging Type incorrectly shows "X-ray"**: The raw intake notes say `"Had Imaging Before ?: yes i had xray in 2025"` — the AI parser is extracting "X-ray" as `imaging_type` when it should be in `imaging_details` / `xray_details` only.

### Fix (1 file)

**`src/components/appointments/ParsedIntakeInfo.tsx`**

Remove the duplicate renders of `imaging_done` (lines 895-901) and `age_range` (lines 903-907) from the PAD-specific section. These are already rendered in the generic section (lines 774-778 and 808-814).

This is purely a UI fix — the duplicate rows exist because both the generic pathology fields block and the PAD-specific fields block render the same data. Removing the second occurrence eliminates the duplicates.

### Why the "Other" and "Imaging Type" issues are data-level

The `other_notes` and `imaging_type` values come from the AI parser (OpenAI). The AI prompt asks it to fill `other_notes` with anything it considers noteworthy, and it's placing the smoking/vascular/blood thinner Q&A there. The `imaging_type` is being set to "X-ray" by the AI extracting from the free-text imaging answer.

These are not fixable by code changes alone for this specific record — the GHL STEP data already correctly populates `smoking_status: "Never"`, `blood_thinners: "YES"`, and `vascular_provider: "Yes"` into their proper fields. The "Other" row just duplicates what's already shown in the dedicated fields below.

**Option**: Filter out `other_notes` content that duplicates data already shown in dedicated fields (smoking, blood thinners, vascular provider). Add a cleanup step in the UI to strip known PAD Q&A patterns from `other_notes` before display.

### Summary of Changes

| Change | File | What |
|--------|------|------|
| Remove duplicate `imaging_done` render | ParsedIntakeInfo.tsx | Delete lines 895-901 |
| Remove duplicate `age_range` render | ParsedIntakeInfo.tsx | Delete lines 903-907 |
| Filter PAD Q&A from `other_notes` display | ParsedIntakeInfo.tsx | Add cleanup regex to strip smoking/vascular/blood thinner text from `other_notes` before rendering |

