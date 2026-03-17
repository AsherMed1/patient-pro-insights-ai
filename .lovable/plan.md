

## Sync DOB and Contact Info Across All Fields

### Problem
The screenshot shows DOB displayed in three places with conflicting values:
- **Header DOB badge**: `1964-05-25` (from top-level `dob` column)
- **Demographics section**: `05/25/1963` (from `parsed_demographics.dob`)
- **Contact Information section**: `1964-05-25` (from `parsed_contact_info.dob`)

When DOB or contact fields are edited in the Contact Information section, the save function (`handleSaveContact`) only syncs to `dob` + `parsed_contact_info` — it does NOT update `parsed_demographics.dob` or recalculate the age. Meanwhile, the header DOB picker (`updateDOB` in AllAppointmentsManager) correctly syncs all three locations.

### Fix (2 changes)

**1. `src/components/appointments/ParsedIntakeInfo.tsx` — `handleSaveContact` function**

Update the save handler to also sync `parsed_demographics` when DOB changes, matching the pattern used by `updateDOB`:
- Fetch current `parsed_demographics` before saving
- Merge the new DOB into `parsed_demographics.dob` and recalculate `parsed_demographics.age`
- Include `parsed_demographics` in the update payload sent to `update-appointment-fields`

**2. `src/components/appointments/ParsedIntakeInfo.tsx` — Remove DOB from Contact Information display**

Remove the "Date of Birth" row from the Contact Information section (both the edit field and the display) since Demographics already displays DOB authoritatively. This eliminates the possibility of showing conflicting values. The DOB edit will remain available via:
- The header DOB picker (badge at top of card)
- The Demographics section display

### No edge function changes needed
The `update-appointment-fields` edge function already accepts arbitrary field updates — it just needs to receive the additional `parsed_demographics` field in the payload.

