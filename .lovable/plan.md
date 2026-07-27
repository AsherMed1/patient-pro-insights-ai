## Problem

Mark Teal (Texas Endovascular - Houston Vein Clinic, appointment `a8b50824-f937-439a-b193-f662a4af9861`, Aug 5 2026, Scheduled/approved, not superseded) has detailed GHL intake notes but corrupted/empty parsed cards. Confirmed in the database:

- `parsed_insurance_info` — corrupted markdown slurp: `insurance_provider` and `insurance_plan` both literally read `"** insurance_provider: BLUE CROSS BLUE SHIELD"`; ID number and group number are null even though the notes contain them
- `parsed_medical_info` — all fields null (notes state PCP: "None", no imaging/urology tests done)
- `parsed_pathology_info` — only `primary_complaint: PAE / BPH` and `procedure_type: PAE`; all symptom fields null despite a full PAE symptom list in the notes
- Parsed Jul 23, `parse_attempts` = 0 — predates the markdown-slurp hardening and was never retried

Demographics (DOB 1964-07-17, age 62) parsed correctly.

## Fix

1. Force a re-parse of the appointment via `auto-parse-intake-notes` with `forceAppointmentId`, so the current hardened parser reprocesses the notes.
2. Verify the resulting JSONB and apply a targeted SQL update for any remaining gaps or leftover markdown corruption:
   - Insurance: provider BCBS (Blue Cross Blue Shield), plan Blue Cross Blue Shield (Silver plan), ID C4C846081889, group 246191
   - Medical: PCP "None reported"; no imaging or urology tests performed
   - Pathology (PAE/BPH): nocturia waking 2+ times per night ongoing over a year, urination more often than every 2 hours, weak/hard-to-control stream, difficulty starting, incomplete emptying, urgency, post-void dribbling, reduced sex drive/ED; no blood in urine, no UTI/bladder/kidney issues; no medications or supplements tried; imaging done = No
3. Re-query the record to confirm all three cards populate cleanly with no markdown artifacts.

Data repair for one record using the existing parser — no code changes proposed.
