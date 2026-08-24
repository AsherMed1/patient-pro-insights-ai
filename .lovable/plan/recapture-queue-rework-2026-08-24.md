# Recapture queue rework

A full pass over the Recapture worklist: method-aware attempt logging, a required conversation-outcome step, clinic-local follow-up scheduling with quick intervals, live outcome/count updates, setter attribution, an Opened bucket, standardized columns, frozen top controls, note color coding, and note/activity collapsing.

## 1. Attempt logging (Call / Text / Email)

Log Attempt only ever appends history — it never completes a record.

- **Call** outcomes: Patient Answered, Left Voicemail, No Answer, Busy, Number Disconnected, Wrong Number.
- **Text** outcomes: Text Sent, Patient Responded, Message Failed / Undeliverable.
- **Email** outcomes: Email Sent, Patient Responded, Email Failed / Undeliverable.
- Callback Requested, Not Interested and Other are removed from attempt outcomes and become conversation outcomes.
- **Wrong Number** completes the record (disposition "Invalid / Wrong Number") and removes it from future recapture/reschedule outreach.

## 2. Conversation Outcome (required after contact)

When Patient Answered / Patient Responded is chosen, a required Conversation Outcome appears. The attempt cannot be saved without it.

| Outcome | Behavior |
| --- | --- |
| Rescheduled / Booked | Requires **Booked / Rescheduled By** setter; completes the record, marks recovered, attributes the booking |
| Follow-Up Required | Opens Schedule Follow-Up; record stays active, moves to Follow-Up |
| Callback Requested | Same as Follow-Up Required |
| Not Interested | Completes the record, saves disposition, blocks all future recapture/reschedule outreach, keeps history |
| Other | Requires a note, then the setter picks Follow-Up Required (schedules, stays active) or Completed (closes with the note as disposition) |

Patient Answered alone never completes a record.

## 3. Schedule Follow-Up modal (clinic-local time)

- Keeps manual date + time, adds quick intervals: 15m, 30m, 45m, 1h, 2h, 3h, 24h.
- Intervals compute from the **current clinic-local time** and pre-fill the editable date/time fields.
- Modal shows the clinic timezone and the exact resulting timestamp ("Scheduled for Aug 19 at 10:30 AM CT"); DST handled by the timezone database.
- The timezone is stored with the follow-up.
- Primary button reads **Schedule Follow-Up**.

## 4. Follow-Up status behavior

- Record stays active in the Follow-Up bucket with the scheduled time and a live countdown (updates without refresh), then **Due**, then **Overdue**.
- When a follow-up becomes due, the assigned/last-working setter gets an in-app bell notification naming the patient; clicking it opens that recapture record.
- Additional attempts can keep being logged until the record is completed.

## 5. Live outcome + live counts

- Saving an outcome updates the open record's Outcome, follow-up time and badges immediately after the backend confirms, with an "Outcome saved" toast; on failure the previous value is kept and an error is shown.
- Records that change bucket update in place first, then reposition.
- Bucket counts (New, Opened, Nurture, Follow-Up, Completed, All) recompute from the **filtered** set — search, clinic, lost type, date range, and any combination. Empty buckets show 0, switching buckets keeps filters, clearing filters restores full totals. The list and counts always agree.

## 6. Booked / Rescheduled By

Searchable dropdown of active setter-role users (review_only / recapture roles), pre-selected to the current user, changeable, required before saving Rescheduled / Booked. The selected user's ID and name are stored on the outcome, shown in the activity history, and used for recapture reporting attribution.

## 7. Opened bucket

- Opening a record stamps an "Opened Recapture record" activity entry (user, date, time) and moves a New record to **Opened**; reopening does not duplicate.
- New = never opened, Opened = reviewed but no attempt logged. The first logged attempt moves it out of Opened into the workflow bucket.
- Opened is included in the live filtered counts.

## 8. @mentions in Recapture notes

Type `@` in a Recapture note to search Portal users; the mention is stored as a linked user token (existing mention format), the mentioned user gets a bell notification, and clicking it opens the record at that note. Author and timestamp preserved.

## 9. Columns, frozen controls, collapsing, note colors

- **Columns** (New / Opened / Nurture / Completed / All): Patient | Clinic | Type | Service Line | Contact Attempts. Follow-Up adds a Status column between Patient and Clinic showing the live countdown / Due / Overdue. No general Status column elsewhere. All headers clearly labeled and consistent.
- **Frozen top block**: bucket tabs, search, filters and the column header row stay pinned while the queue scrolls.
- **Collapse/expand** independently for Notes and Activity History, each showing its entry count when collapsed ("Notes (8)", "Activity History (24)"), state preserved while the record is open.
- **Note color coding** across the Portal and Recapture: PPM-authored notes blue, clinic notes the default style, system updates dark green — each with an explicit PPM / Clinic / System label plus author name, role, timestamp and content (never color alone).
- **Remove GHL tag noise**: "GHL no-show tags applied…" / "GHL cancellation tags applied…" style entries are hidden from the operational notes/activity view (still written for troubleshooting). Cancellations, no-shows, outcome changes, attempts, follow-ups and user actions stay visible. OON records are kept out of the cancellation list.

## Technical notes

- Migration on `public.recapture_cases`: add `opened_at`, `opened_by`, `follow_up_timezone`, `booked_by_user_id`, `booked_by_name`, `conversation_outcome`; allow `work_status = 'opened'` (existing `new`/`nurture`/`follow_up`/`completed` unchanged).
- Migration on `public.recapture_attempts`: add `conversation_outcome`, `booked_by_user_id`, `booked_by_name`; widen the result vocabulary for text/email outcomes.
- Follow-up scheduling uses the clinic's `projects.timezone` (already cached by `src/utils/projectTimezoneCache.ts`) for both manual entry and interval math; store the resolved UTC instant plus the timezone label.
- Not Interested / Wrong Number completions insert an active row into `patient_reschedule_blocks` so the patient is excluded from future recapture and reschedule surfaces.
- Notifications reuse `public.qa_note_mentions` (its `case_id`/`note_id` are nullable and it already carries `kind`/`title`/`body`) with new kinds `recapture_follow_up_due` and `recapture_mention`; `MentionsBell` gains routing to the Recapture record, and a scheduled job (or a due-check on load) emits the follow-up-due rows.
- Frontend: `src/components/recapture/types.ts` (statuses, method-scoped outcome maps, conversation outcomes, clinic-local countdown helper), `RecaptureQueue.tsx` (Opened tab, filtered counts derived from the same memo that feeds the table, per-bucket column sets, sticky header/filters/tabs via the existing `useStickyHeight` pattern), `RecaptureCaseDrawer.tsx` (attempt → conversation outcome flow, open-stamp, collapsible Notes/Activity, mention input, optimistic-after-confirm outcome update), new `ScheduleFollowUpDialog.tsx` and `BookedBySelect.tsx`.
- Note styling and GHL-tag filtering are shared helpers so the patient portal note list and the Recapture drawer render identically.

## Validation

Work a test case end to end per method: open it (lands in Opened), log a Call → Patient Answered → Follow-Up Required with a 30 min quick interval (verify the clinic-local time and countdown), confirm the bell fires when due, then Patient Answered → Rescheduled / Booked with another setter selected and confirm the record completes with correct attribution. Search "test" and confirm every bucket count matches the visible rows.
