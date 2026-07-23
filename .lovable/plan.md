## Goal
In the QA Operations Queue, let admins search by patient phone number and email, and surface both values in the top-right patient info block of the case drawer (where the red box is drawn in the screenshot).

## Changes (all in `src/components/admin/QAOperationsQueue.tsx`)

1. **Enrich loaded cases with phone/email**
   - Extend the `QACase` interface with optional `lead_phone_number` and `lead_email`.
   - After the existing `qa_cases` load, batch-fetch `id, lead_phone_number, lead_email` from `all_appointments` for every distinct `appointment_id` in the result set (single `.in('id', [...])` query, chunked to 500 to stay under PostgREST limits).
   - Merge the phone/email onto each case in memory before calling `setCases`.

2. **Extend the search filter**
   - Update the `filteredNoStatus` predicate so the search string also matches `lead_phone_number` (digits-only compare — strip non-digits from both sides so `(555) 123-4567` matches `5551234567`) and `lead_email` (case-insensitive substring).
   - Update the search input placeholder to `Search patient, phone, email, project, service, error…`.

3. **Show phone/email in the drawer header**
   - In `CaseDrawer`, extend the existing `all_appointments` fetch (the one that already selects `date_of_appointment, requested_time`) to also select `lead_phone_number, lead_email`, and store them alongside `liveAppt`.
   - Under the subtitle line "Humble Vascular Surgery Center • Request Your GAE…" (the empty red-boxed area in the screenshot), render two small muted rows:
     - `Phone: <formatted phone>` (fallback `—`) — wrap in a `tel:` link
     - `Email: <email>` (fallback `—`) — wrap in a `mailto:` link
   - Keep it compact (text-xs, `text-muted-foreground`, `break-all` on the email) so it doesn't disturb the existing grid.

## Out of scope
- No schema changes; `all_appointments.lead_phone_number` / `lead_email` already exist.
- No changes to ticket creation, notes, activity, or filters other than the search input.
