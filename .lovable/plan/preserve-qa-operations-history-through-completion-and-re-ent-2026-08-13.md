# Preserve QA Operations history through completion and re-entry

## What I verified

- For the Emage Fibroid test patient there are **five separate QA records** (confirmed audit, short notice, OON, and two cancellations) — all for the same patient and mostly the same appointment. Notes, activity, escalation fields and ControlHub tickets are stored **per record**, not per patient, so opening a newer record shows an empty Notes/Activity/Ticket area even though work was logged on the sibling record.
- There are currently **zero notes** on any of that patient's records, so I cannot yet confirm whether the tester's notes were deleted or were written on a record that was later re-alerted. Verifying this is step 1 below.
- Confirmed destructive behavior: when a completed record receives a new alert, the system **wipes Escalation Type and Date Resolved** on that record before returning it to the New queue. That is exactly the "evidence it had previously been escalated" loss described.
- Confirmed: reopening a record whose escalation was **Resolved** silently rewrites the escalation status to **Follow-Up Required**, so the final Resolved state is lost.

## The fix

1. **Verify the note loss.** Audit whether any QA note rows were ever created for this patient and whether anything deletes notes/mentions/activity on completion. Report the finding; if a delete path exists, remove it.

2. **Stop resetting history on re-alert.** When a completed record is re-alerted, keep Escalation Type, escalation status, owner, escalated-by, escalated-at, and the previous resolution date. Instead of overwriting them, snapshot the closed cycle into the activity timeline ("Previous cycle: Escalated to AM, Resolved on Aug 6") and start the new cycle without erasing the old one.

3. **Keep "Resolved" visible.** Reopening a record no longer rewrites Resolved to Follow-Up Required. The escalation badge shows the last recorded escalation status, with a "previously Resolved" marker when the record has been reopened. Records that were never escalated still read "Not escalated".

4. **Show patient-level history in the drawer.** Under the record's own Notes/Activity, add a collapsed **"History for this patient"** section that pulls notes, mentions, activity, escalation changes and ControlHub ticket references from every sibling record for the same patient/appointment (the same grouping the queue already uses for the alert chips). Each entry is labeled with its source alert (e.g. "Short-Notice · Aug 6") and is read-only. This makes prior notes, ticket activity and escalation evidence visible from whichever record the QA specialist opens, including after reschedule, reconfirmation or re-entry.

5. **Ticket continuity.** If any sibling record has a linked ControlHub ticket, surface it (ticket id, status, latest activity) on the current record as a linked-ticket reference instead of showing "no ticket".

## Technical notes

- `public.qa_upsert_case` (migration): drop the `resolution_type = NULL` / `date_resolved = NULL` resets in the completed-case branch; carry the closed-cycle values into the `realerted` activity `metadata`.
- `public.qa_cases_escalation_status_sync` (migration): remove the `Resolved -> Follow-Up Required` rewrite on reopen; keep the completed/resolved mirroring already in place.
- `QAOperationsQueue.tsx`: the drawer already receives `selectedSiblings`; fetch notes/activity/mentions for `[caseData.id, ...siblingIds]` and render sibling entries in a separate read-only "History for this patient" block, keeping the existing composer scoped to the current record. Reuse `groupKeyFor` for sibling resolution and `ticketCase` for the linked-ticket fallback.
- No changes to ingestion triggers, alert routing, or the Review Queue.
