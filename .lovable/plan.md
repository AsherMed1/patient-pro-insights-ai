# Insurance card uploads not saving (back of primary, both secondary)

## What the record actually shows

For Seamless Test (Seamless Medical Centers), the database currently holds:

- Primary front: a **GoHighLevel** document link (the card that came in with the lead) — not an uploaded file
- Primary back: empty
- Secondary front/back: empty

There are **no files in the insurance-cards storage bucket** for this appointment. So the front card visible in the screenshot is the original GHL card, and none of the four uploads reached storage. This is not a "back image got dropped" bug — the uploads themselves are failing or being abandoned, silently enough that only one image appears.

The storage bucket, its access policies, and its size/type limits are all fine, so the failure is happening in the browser upload step or right after it.

## Step 1 — Confirm the failure point (before changing behaviour)

Reproduce an upload on a test appointment with the browser console and network panel captured, to see which of these is happening:

- the file never gets sent (input change handler not firing on re-selection, HEIC conversion aborting, oversize file)
- the storage upload request fails (error surfaced only as a toast that can be missed)
- the upload succeeds but the follow-up save call overwrites or drops the value

The three are distinguishable from a single reproduction, and the fix below is scoped by what it shows.

## Step 2 — Harden the upload flow (applies regardless of which branch it is)

In `InsuranceCardUpload.tsx` and `SecondaryInsuranceCardUpload.tsx`:

1. **Reset the file input after each selection** so picking the same or a second file always fires. Today, `input.value` is never cleared, so a second selection in the same session can silently do nothing — the single most likely explanation for "only one of four images stuck".
2. **Surface real errors instead of a generic toast**: include the storage/save error message, and keep the failed side in an error state in the card tile (red border + "Upload failed — retry") rather than reverting to the empty dropzone, which reads as "nothing happened".
3. **Serialize saves per card**: queue the persist calls so a front and a back saved seconds apart can't race. For the secondary card this matters more, because its values live inside a JSON field that is read-modify-written by the server function.
4. **Verify after save**: re-read the appointment's four card fields after persisting and only show the green check when the value is actually in the database; otherwise show the retry state.

## Step 3 — Backfill the record in question

Re-upload the four images for Seamless Test once the flow is fixed, and confirm all four fields populate.

## Technical notes

- Files: `src/components/appointments/InsuranceCardUpload.tsx`, `src/components/appointments/SecondaryInsuranceCardUpload.tsx`
- Primary card writes to the `insurance_id_link` / `insurance_back_link` columns; secondary writes to `secondary_card_front_url` / `secondary_card_back_url` inside `parsed_insurance_info`, merged server-side by the `update-appointment-fields` edge function. Read paths in `ParsedIntakeInfo.tsx` and `DetailedAppointmentView.tsx` already match those keys, so no schema or read changes are needed.
- No database migration required.
