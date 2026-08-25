# Fix Vascular Institute of Michigan time-preference leads

## What I found

- The test contact (GHL id `XTIAuY0k3YNFNQQ1nvPm`) has **no row at all** in the portal, and **no** Vascular Institute of Michigan record has ever stored a time preference — every VIM row has a booked appointment date.
- The project row is configured correctly: location `TNqlJFl1yDyS7eIXWtlf`, GHL API key present, timezone US/Eastern.
- The webhook handler only allows lead-only (no appointment date, no appointment id) payloads to create records for an explicit allowlist of time-preference projects: Premier Vascular, ECCO Medical, Davis Vein & Vascular, Horizon Vascular Specialists, Prospero Vascular and Interventional. Anything else is dropped with "Skipping lead-only payload for non-unscheduled project".
- **Vascular Institute of Michigan is not on that allowlist**, so a lead submitted with only a time preference (no calendar booking) is silently discarded. This is the most likely cause; recent edge logs no longer cover the test submission, so step 1 below re-verifies with a live replay.
- The same project is also missing from the secondary allowlists: the appointments REST API dedupe list and the portal card UI that renders the "set date/time" control for time-preference leads.

## Plan

1. **Confirm the drop path** — replay the test contact through the intake path and capture the handler log line for it, so we know it is the allowlist and not a GHL workflow that never fired.
2. **Add Vascular Institute of Michigan to time-preference capture** in the webhook handler allowlist, so lead-only submissions create a portal row with `time_preference` instead of a booked date, and later GHL calendar events cannot silently overwrite that state.
3. **Align the secondary lists** so behavior is consistent everywhere:
   - the appointments REST API one-active-row-per-contact dedupe list,
   - the appointment card control that lets the clinic set date/time for an unscheduled lead.
4. **Recover the test lead** by importing the contact from GHL, then verify it lands in the Review Queue as pending with a populated time preference, correct service, and no phantom appointment date.
5. **Re-run once more** to confirm no duplicate row is created for the same contact.

## Technical notes

- Allowlist lives in `supabase/functions/ghl-webhook-handler/index.ts` (`UNSCHEDULED_CAPTURE_PROJECTS`), matched against the normalized lowercase project name.
- Secondary lists: `UNSCHEDULED_PROJECTS` in `supabase/functions/all-appointments-api/index.ts` and the project array in `src/components/appointments/AppointmentCard.tsx`.
- Recovery uses the existing `import-missing-leads-from-ghl` function with the project name and contact id.
- No schema change required; `time_preference` already exists on `all_appointments`.
