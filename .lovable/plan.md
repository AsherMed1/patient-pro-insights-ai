Restore the most recent declined test row so you can Approve it and test the OON flow end-to-end.

**Target row**
- Project: Georgia Endovascular
- Name: THIS IS TEST ONLY (DO NOT CONTACT) 123
- Phone: +1 (602) 341-3087
- Appointment date: 2026-07-15
- ID: `2952d972-efc5-4e90-a0fa-e0c640cd4d44`
- Current: `review_status='declined'`, `status='Do Not Call'`

**Change**
Update this single row in `all_appointments`:
- `review_status` → `pending` (puts it back in Review Queue)
- `status` → `Confirmed` (clears the Do Not Call terminal state so OON becomes a valid transition after Approve)
- Clear `decline_reason`, `decline_notified_at`, `declined_at`, `declined_by` so it looks fresh
- `is_superseded` → `false`

**Then you**
1. Open Review Queue → Approve this row
2. From the client portal (Georgia Endovascular), change status to **OON**
3. Confirm: Slack OON alert fires, `appointment-status-webhook` posts to the project's webhook URL, and a status-change note is written

No code changes, no schema changes — one data update.