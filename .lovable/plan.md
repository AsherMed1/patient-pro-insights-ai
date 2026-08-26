# Fix Alliance Vascular time-preference leads

## What I found

- The test contact (GHL id `DejDdHBhgj6kczEbX7OS`) has **no row** in the portal, and no Alliance Vascular record has ever stored a time preference — every Alliance row has a booked appointment date.
- The project itself is configured correctly: Alliance Vascular, location `hIiQlSbUTg0242gvlOqG`, GHL API key present, timezone America/Los_Angeles.
- The webhook handler only lets lead-only payloads (no appointment date, no appointment id) create a record for an explicit allowlist of time-preference clinics: Premier Vascular, ECCO Medical, Davis Vein & Vascular, Horizon Vascular Specialists, Prospero Vascular and Interventional, Vascular Institute of Michigan. Anything else is dropped ("Skipping lead-only payload for non-unscheduled project").
- **Alliance Vascular is not on that allowlist**, so a submission with only a time preference is silently discarded. Alliance is also missing from the appointments REST API dedupe list and from the portal card that renders the "set date/time" control for unscheduled leads.

## Plan

1. **Add Alliance Vascular to time-preference capture** in the webhook handler allowlist so lead-only submissions create a pending portal row with `time_preference` instead of a booked date.
2. **Align the secondary lists** so behavior is consistent: the appointments REST API one-active-row-per-contact/time-preference list, and the appointment card control that lets the clinic set date/time for an unscheduled lead.
3. **Deploy** the affected edge functions (the last time-preference clinic needed an explicit deploy before it worked).
4. **Recover the test lead** by importing contact `DejDdHBhgj6kczEbX7OS` from GHL, then confirm it lands in the Review Queue as pending with a populated time preference, correct service, and no phantom appointment date.
5. **Re-run the import once more** to confirm no duplicate row is created for the same contact.

## Technical notes

- `UNSCHEDULED_CAPTURE_PROJECTS` in `supabase/functions/ghl-webhook-handler/index.ts` (matched on normalized lowercase project name).
- `UNSCHEDULED_PROJECTS` in `supabase/functions/all-appointments-api/index.ts`.
- Project array around line 1789 in `src/components/appointments/AppointmentCard.tsx`.
- Recovery uses the existing `import-missing-leads-from-ghl` function with project name and contact id.
- No schema change needed; `time_preference` already exists on `all_appointments`.
- Memory note for Alliance unscheduled capture will be added alongside the change.
