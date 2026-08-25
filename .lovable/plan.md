# Verify Vascular Institute of Michigan lead ingestion

## What I checked

- The current code includes **Vascular Institute of Michigan** in the time-preference allowlist for `ghl-webhook-handler`.
- The portal database does **not** currently show a new VIM time-preference row; the latest VIM rows I found are still booked-date appointment rows.
- Recent `ghl-webhook-handler` logs show the function is receiving leads from other clinics, but I found **no recent VIM/location logs** for `TNqlJFl1yDyS7eIXWtlf` and no log for the earlier test contact `XTIAuY0k3YNFNQQ1nvPm`.

## Current answer

New VIM time-preference leads **should be accepted by the portal code now**, but the latest missing test suggests the VIM GHL workflow may not be calling the portal webhook, or it may be sending a payload that does not identify the VIM project/location correctly.

## Plan

1. **Identify the latest missing test lead**
   - Use the GHL contact link or contact ID for the newest test lead.
   - Check whether a portal row exists under that contact ID, appointment ID, phone, or email.

2. **Confirm whether GHL hit the portal webhook**
   - Search `ghl-webhook-handler` logs for the contact ID, VIM location ID, lead name, and request timing.
   - If no log exists, treat it as a GHL workflow/webhook routing issue rather than a portal insertion bug.

3. **If the webhook did arrive, inspect the payload path**
   - Confirm project matching resolved to `Vascular Institute of Michigan`.
   - Confirm the lead-only payload passes the unscheduled-capture gate.
   - Confirm `time_preference`, `is_unscheduled`, `review_status`, and `review_stage` are written correctly.

4. **If the webhook did not arrive, recover and harden**
   - Recover the missing lead through the existing GHL import function.
   - Add any code hardening needed if the VIM workflow uses a different payload shape than the previous test.
   - Provide the exact GHL workflow/webhook endpoint check needed if the problem is outside the portal code.

5. **Verify end-to-end**
   - Submit or replay one VIM time-preference test.
   - Confirm it appears in the Review Queue as pending, with no appointment date and a populated time preference.
   - Re-run/replay once to confirm no duplicate is created.

## What I need

Please send the GHL contact link or contact ID for the latest missing VIM test lead so I can trace the exact submission.
