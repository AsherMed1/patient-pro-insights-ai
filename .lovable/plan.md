## Findings

- Shakonya Baynes / GHL contact `Vb4ppbf9kKZdDAIykNN3` is not in `all_appointments`, `new_leads`, or `ghl_contacts`.
- `ghl-webhook-handler` logs have no entries for the contact ID, first name, or last name.
- This matches the prior Liberty cases: the appointment never reached our webhook pipeline, so it cannot appear in the portal until backfilled.

## Plan

1. **Use the existing backfill tool**
   - Run `backfill-ghl-appointment` for Liberty Joint & Vascular and contact `Vb4ppbf9kKZdDAIykNN3`.
   - The function will fetch Shakonya’s contact and appointment data directly from GHL, then pass it through `ghl-webhook-handler` so the inserted row follows the same routing/dedupe rules as normal webhooks.

2. **Verify portal eligibility after backfill**
   - Query `all_appointments` for Shakonya.
   - Confirm `project_name`, appointment date/time, `status`, `review_status`, `is_unscheduled`, and `ghl_appointment_id`.
   - If `review_status='approved'`, she should show on the portal immediately.
   - If `review_status='pending'`, she will appear in the Review Queue first and stay hidden from the client portal until approved.

3. **Check logs for the root-cause signal**
   - Review `backfill-ghl-appointment` and `ghl-webhook-handler` logs for this contact ID after running it.
   - Report whether this was another missed GHL webhook delivery versus a portal filtering issue.

## Technical details

- No schema changes are needed.
- No code changes are expected unless the existing backfill function returns an API/shape error for this contact.
- If the GHL contact has an existing `approved` tag or a qualifying setter-submitted intake source, the normal handler rules should auto-approve it; otherwise it should route to the Review Queue.