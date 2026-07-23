## Problem

`parsed_medical_info.pcp_name` and `pcp_phone` on Sandra Pongrass (`4994537b-f403-4cf6-88fc-f6558c631c03`) contain the "Follow-Up Notes: Patient insurance under husband William Pongrass..." blob instead of her real PCP info. The parser slurped a downstream label into the PCP fields.

The correct values are present in the intake notes under **Medical Information**:
- PCP Name: `Dr. Sinonith`
- PCP Phone: `281 392 6797`

The follow-up narrative belongs in a notes field, not PCP.

## Fix (data-only)

Update Sandra's `parsed_medical_info` JSONB:
- `pcp_name` → `"Dr. Sinonith"`
- `pcp_phone` → `"281 392 6797"`
- Preserve the "Patient insurance under husband William Pongrass with CIGNA PPO; Awaiting appointment coordination from Tamra..." context by moving it into `parsed_medical_info.notes` (so it still shows in the Notes area of the Medical card, not as PCP).
- Leave `imaging_details` as-is.

No code, schema, or trigger changes — the underlying parser hardening for "Patient Intake Summary"-style single-line blob hijacking is already tracked in memory (`ghl-patient-intake-summary-blob-sanitization`). This is a one-off data repair for the already-corrupted row.

## Verify

Reload the Davis project portal → Sandra Pongrass → Medical & PCP Information card shows:
- PCP Name: Dr. Sinonith
- PCP Phone: 281 392 6797
- Notes: the William Pongrass / CIGNA follow-up context
