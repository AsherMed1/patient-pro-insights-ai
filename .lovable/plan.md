# Fix: Group Number missing in the Insurance Information overlay

## What's happening

Sandra Tickle's record does have the group number stored. In `all_appointments`, `parsed_insurance_info` holds:

- `insurance_provider`: CareFirst
- `insurance_plan`: Care first Medicare advantage
- `insurance_id_number`: MXJ 928024242
- `insurance_group_number`: **CF030000**

So the data synced fine. The overlay is looking in the wrong place.

The overlay's data is assembled by a `getInsuranceData()` helper that exists in two components, and the two versions disagree on field names:

- The appointment card version reads `insurance_group_number` first, then `group_number` — it works.
- The detailed appointment view version (the one that opens the overlay in the screenshot) only reads `group_number` and the lead's `group_number`. Since the stored key is `insurance_group_number`, it resolves to undefined and the overlay prints "Not provided".

The same mismatch affects the Insurance ID in that version (it reads `id` instead of `insurance_id_number`); it only looks correct today because the `detected_insurance_id` column happens to be populated.

## Fix

Align the detailed-view mapping with the card mapping so both read every known key variant:

- Group number: `insurance_group_number` → `group_number` → lead's `group_number`
- Insurance ID: `insurance_id_number` → `id` → `detected_insurance_id` → lead's value
- Provider/Plan: also accept `insurance_provider` / `insurance_plan` keys alongside `provider` / `plan`
- Apply the same key-variant handling to the secondary insurance fields

Then extract this into one shared helper used by both the card and the detailed view, so the two paths can't drift apart again.

## Technical detail

- `src/components/appointments/DetailedAppointmentView.tsx` — `getInsuranceData()` (~line 708) is the source of the bug.
- `src/components/appointments/AppointmentCard.tsx` — `getInsuranceData()` (~line 672) is the correct reference implementation.
- New shared helper (e.g. `src/lib/insuranceFields.ts`) that takes the appointment plus optional lead details and returns the normalized shape `InsuranceViewModal` expects.
- No database or edge-function changes: this is display-layer only, no migration needed.

## Verification

Open Sandra Tickle (Vascular Surgery Associates, Sep 16 2026) → Insurance Information overlay and confirm Group Number reads CF030000, and that the inline insurance panel and the card overlay still show the same values.
