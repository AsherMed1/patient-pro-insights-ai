# Recover the missing Alliance Vascular test lead

## What I verified

- Contact `j4vLlHmWiad5RXo3vzTJ` has **no row** in `all_appointments` — not pending, not declined, not superseded. No Alliance Vascular row was created today at all.
- Alliance Vascular **is** correctly on all three time-preference lists (webhook handler allowlist, appointments API dedupe list, appointment card date/time control), from the fix yesterday.
- The earlier test contact (`DejDdHBhgj6kczEbX7OS`) **did** flow through today: a row was created at 17:55 UTC (insurance-card fetch + EMR queue trigger fired) and was approved in the Review Queue at 18:01 UTC by Althea. That row no longer exists in the table, so it was deleted after approval.
- Edge function logs only retain the last few minutes, so there is no surviving log line for either contact. The reason the new submission produced nothing is **not yet confirmed** — either the GHL workflow never called the portal webhook, or the payload was dropped before any write (no audit trail was produced, which points at "never arrived / dropped very early").

## Plan

1. **Confirm whether the webhook arrived.** Re-submit or replay the Alliance test intake and watch `ghl-webhook-handler` logs live for that location/contact. This distinguishes a GHL workflow routing problem from a portal ingestion bug.
2. **If it never arrives:** the Alliance GHL workflow is not firing the portal webhook for time-preference submissions — identify the exact workflow/webhook step that needs to be added on the GHL side and report it precisely.
3. **If it arrives but is dropped:** capture the drop log line and fix the gate that rejects it (project resolution, lead-only gate, or the one-active-unscheduled-row-per-contact unique index).
4. **Recover the current test lead** by importing contact `j4vLlHmWiad5RXo3vzTJ` for Alliance Vascular through the existing GHL import function, then confirm it lands in the Review Queue as pending, with a populated time preference, correct service, and no phantom appointment date.
5. **Re-run the import once** to confirm no duplicate row is created for the same contact.
6. **Clarify the deleted record.** Confirm whether the earlier approved Alliance test row was deleted intentionally during testing; if not, trace the delete path so approved rows cannot disappear.

## Technical notes

- Allowlists already contain Alliance: `UNSCHEDULED_CAPTURE_PROJECTS` in `supabase/functions/ghl-webhook-handler/index.ts`, `UNSCHEDULED_PROJECTS` in `supabase/functions/all-appointments-api/index.ts`, and the project array in `src/components/appointments/AppointmentCard.tsx`.
- Recovery uses `import-missing-leads-from-ghl` with project name `Alliance Vascular` and the contact id.
- No schema change expected.
