

## Nicholas Wadsworth — Missing Medical & PCP Data

### Root Cause

The GHL contact record for Nicholas Wadsworth has three fields with data (visible in your screenshot):
- **Insurance Notes**: "The patient has had knee pain for 10 years..."
- **Primary Care Doctor's Name And Phone**: "Not available Rn"
- **Had Imaging Before?**: "3 Years ago"

However, the portal's last data pull (March 3rd) did not capture these fields — they were either added to the GHL contact after the sync or the GHL API omitted them at that time. The stored `patient_intake_notes` and `parsed_medical_info` confirm these fields are completely absent.

### No Code Changes Needed

The field mapping and parsing logic already handles all three fields correctly:
- "Insurance Notes" → routes to `insurance_notes` in parsed insurance info
- "Primary Care Doctor's Name And Phone" → matches `doctor` / `primary care` keywords → extracts PCP name (and phone if present)
- "Had Imaging Before?" → matches `imaging` keyword → populates `imaging_details`

### Recommended Action

**Click "Refresh from GHL"** on Nicholas Wadsworth's appointment card in the portal. This triggers the full 3-step pipeline:
1. Re-fetches all custom fields from GHL API
2. Resets parsing timestamp
3. Re-runs the auto-parser

This will pull the three missing fields and populate Medical & PCP Information with:
- PCP Name: "Not available Rn"
- Imaging Details: "3 Years ago"
- Insurance Notes: the knee pain history text

If the refresh still doesn't capture these fields, the GHL API may be filtering them out for this sub-account, and we'd need to check the edge function logs to see exactly which custom fields are returned.

