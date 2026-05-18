## Goal
Post a Slack message to **#appt-booked-verification** every time a new appointment lands in the Admin Review Queue (`review_status = 'pending'`), so verifiers get pinged in real time.

## Message format
```
🔔 Appointment Verification Required

Account:  {project_name}
Patient:  {lead_name}
Email:    {lead_email}
Phone:    {lead_phone_number}
Calendar: {calendar_name}
Status:   {status}

🔗 Open in Review Queue → https://patientproclients.com/?tab=review-queue&appt={id}

Setter Instructions:
Review details and take action — Approve if verified, Decline if duplicate/spam/test/wrong project, Mark as OON if insurance is out of network.
```
Rendered with Slack Block Kit (header + fields + button linking to the Review Queue), matching the look of the existing OON / short-notice alerts.

## Implementation

1. **New edge function** `supabase/functions/notify-slack-review-queue/index.ts`
   - Same shape as `notify-slack-oon` (incoming webhook, no JWT).
   - Reads `SLACK_REVIEW_QUEUE_WEBHOOK_URL` secret.
   - Accepts: `appointmentId, projectName, leadName, leadEmail, phone, calendarName, status`.
   - Posts Block Kit payload with an "Open Review Queue" button → deep link to the app.

2. **Trigger points** — fire-and-forget invoke after every new pending insert:
   - `supabase/functions/ghl-webhook-handler/index.ts` — after the insert path that sets `review_status='pending'`.
   - `supabase/functions/all-appointments-api/index.ts` — after the insert branch (skip on update).
   - CSV import path (`AppointmentsCsvImport.tsx` / its server route) — same hook.
   Use `supabase.functions.invoke('notify-slack-review-queue', { body: {...} })` without `await` blocking the response (consistent with how short-notice alert is fired today).

3. **Deep link** — Review Queue tab in `src/pages/Index.tsx` already accepts a tab key; we'll pass `?tab=review-queue&appt={id}` and have `ReviewQueue.tsx` auto-open the matching row's detail modal on mount if the param is present (small, additive).

4. **Secret** — user adds an Incoming Webhook in Slack for `#appt-booked-verification`, we store as `SLACK_REVIEW_QUEUE_WEBHOOK_URL` (same pattern as `SLACK_OON_WEBHOOK_URL`).

5. **Guards**
   - Only fire on **new** inserts where `review_status = 'pending'` (skip updates, skip CSV bulk re-imports of existing rows).
   - Try/catch around the invoke — never block appointment creation if Slack fails.
   - No dedupe needed beyond the "insert only" guard; the review queue is one notification per new row.

## Setup steps for the user
1. In Slack: **Apps → Incoming Webhooks → Add to #appt-booked-verification** → copy webhook URL.
2. Paste it when I prompt for the `SLACK_REVIEW_QUEUE_WEBHOOK_URL` secret.
3. I deploy the function and wire the three insert points.

## Files touched
```
supabase/functions/notify-slack-review-queue/index.ts   (new)
supabase/functions/ghl-webhook-handler/index.ts         (invoke after pending insert)
supabase/functions/all-appointments-api/index.ts        (invoke after insert)
src/components/AppointmentsCsvImport.tsx                (invoke per imported row)
src/components/admin/ReviewQueue.tsx                    (auto-open ?appt= param)
src/pages/Index.tsx                                     (honor ?tab=review-queue)
mem://features/admin-review-queue                       (note Slack hook)
```

## Open question
- Want a single message per appointment, or also re-ping if the row gets a meaningful GHL update while still pending (e.g., status flips Pending → Confirmed)? Default = single message on insert only.