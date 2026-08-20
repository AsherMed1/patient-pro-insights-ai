# Fix: Trainee Submitted bookings land in "New" instead of "Trainee Review"

## What actually happened with your test

Your test booking (Test Johann, Ally Vascular, 17:42 UTC today) was created with `review_stage = 'new'` and `insurance_intake_source = NULL`. The webhook log for that request says:

```text
Extracted webhook data: { ... insurance_intake_source: null }
[WARN] Insurance Intake Source not present in webhook payload nor on GHL contact — routing to review queue.
Creating new appointment (review_status=pending, bypass=none, intake_source=unspecified [missing])
```

So the routing logic is fine — it never saw the value. Two confirmed causes:

1. **GHL's appointment webhook payload does not carry the Insurance Intake Source custom field** for this booking, so the handler falls back to fetching the contact from the GHL API.
2. **The fallback lookup failed for this project.** It looks up credentials with an exact match on `project_name`, but the webhook resolved the project as `Ally Vascular and Pain Centers` (single space) while the `projects` row is `Ally Vascular  and Pain Centers` (double space). No exact match, so no API key, so no fallback — the value is lost and the record defaults to New.

A related bug found while checking: another booking one minute earlier (Veronica Hill) *did* resolve `patient_submitted` via the fallback, yet its `insurance_intake_source` column is still NULL — the later update path re-extracts the field from a payload that doesn't contain it and overwrites the stored value with null.

## The fix

### 1. Make the credential lookup whitespace/case tolerant
In `fetchIntakeSourceFromContact`, resolve the project the same way the rest of the sync does: normalize whitespace and case (and fall back to `ghl_location_id` from the payload, which is the most reliable key) instead of a raw `.eq('project_name', ...)`. Log clearly when credentials still can't be found.

### 2. Prefer location id for the fallback
Use `payload.location.id` / `ghl_location_id` first to find the project row, then project name. Ally's location id `vRT9AlSvuJsupOjfJekW` matches exactly, so this alone fixes the failing case.

### 3. Stop null-overwriting a known intake source
On the update path, only write `insurance_intake_source` when the incoming payload actually resolved a value; never overwrite a stored non-null source with null. Same guard for `review_stage`: if the stored source is trainee, the record stays in the Trainee bucket.

### 4. Late-arriving trainee value should still reroute
If an appointment already exists in `review_stage = 'new'`/`pending_review` with `review_status = 'pending'`, and a later webhook resolves `trainee_submitted`, move it to `review_stage = 'trainee'` (never move an already approved/declined record).

### 5. Manual override in the Review Queue
Add a small "Move to Trainee Review" row action (admin/trainer) so a mis-routed record can be reclassified without waiting on GHL — sets `insurance_intake_source='trainee_submitted'`, `review_stage='trainee'`, and writes an attributed internal note.

### 6. Verify with your existing test record
After the fix, re-fire the same booking (or use the manual override on Test Johann) and confirm it appears in Trainee Review with the Approve / Return-to-trainee actions.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: rework `fetchIntakeSourceFromContact` project resolution (location id → normalized name), guard the update-path assignment of `insurance_intake_source`, add the trainee reroute branch.
- `src/components/admin/ReviewQueue.tsx`: add the "Move to Trainee Review" action and note-writing.
- No schema change needed — `insurance_intake_source`, `review_stage`, `trainee_name` already exist.
