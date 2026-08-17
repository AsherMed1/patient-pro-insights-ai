# Fix: logged contact attempts not reflected on the record

## What I checked

For Brenda Arrington the data is correct: there is one logged attempt (Call / Left voicemail, 8/14 7:18 AM CT, Luis Nicolas Guzman) plus the mirrored internal note on the same appointment row. So the attempt was saved — the queue row simply did not reflect it, which means the badge only failed to display.

Two structural reasons the badge can go stale or blank:

1. The queue's attempt lookup keys strictly on the current row id. Records get superseded and replaced by a fresh row for the same patient (the "one active row per contact" behaviour), and the attempt stays attached to the old row id — so the new pending row reads as "No contact logged" even though the same patient was called. The dialog opened from the row can still show history when it is opened on the row that owns the attempt, which is why the two disagree.
2. The two lookups (attempts, last note) fail silently — a `console.warn` only. If either request errors or is skipped, the row silently falls back to "No contact logged" with no signal to the user, and it only recovers on a full queue refetch.

## What to change

### 1. Attempt history follows the patient, not just the row
Resolve contact attempts and the last human note across the patient's sibling appointment rows (same GHL contact, or same phone + project), not only the currently displayed row id. A call logged before the record was superseded still counts as contact on the live record. Attempt counts aggregate across those siblings.

### 2. Instant, reliable update after logging
When an attempt is logged, update the row's badge immediately from the submitted values (optimistic), then reconcile with a refetch. The badge flips from "No contact logged" to "Last contact just now · Call, no answer · <user>" without waiting for a queue reload.

### 3. No more silent blanks
If the attempt or note lookup fails, keep the previous known value instead of clearing it, and surface a small "Contact history unavailable" state plus an error toast so a blank badge is never mistaken for "nobody called".

### 4. Show contact state in the New bucket too
Today the last-contact / attempt badges render only in Pending Review. Show them in the New bucket as well so a setter sees prior outreach before moving a record along. (Say the word if you want New left untouched.)

## Technical notes

- `src/components/admin/ReviewQueue.tsx`: build a sibling-id map per row (query `all_appointments` for same `ghl_id`, or `lead_phone_number` + `project_name`), then query `appointment_contact_attempts` and `appointment_notes` with `.in('appointment_id', allSiblingIds)` and fold results back onto the displayed row id. Attempts logged on a sibling get a "earlier record" hint in the badge tooltip.
- Replace the `setAttemptsByRowId({})` / silent `console.warn` paths with merge-on-success semantics plus an error flag per fetch.
- `LogAttemptDialog.tsx`: extend `onLogged` to pass the created attempt so `ReviewQueue.tsx` can apply it optimistically; the dialog's own history query reuses the same sibling id set.
- Gate the badge rendering on `queueView === 'pending' || queueView === 'new'`.
- No schema or RLS changes needed — reads are already permitted for admin/agent/va/review_only/qa_specialist/recapture.
