# Fix stub intake notes (Kristy Theodore) + approved-tag audit guard

## What the data shows

Kristy Theodore (Vivid Vascular, 0b496bf4) has only **91 characters** of intake notes:

```text
**Contact:** address: 2224 Northwest 4th Street | city: Miami | state: Florida | zip: 33125
```

Every other Vivid Vascular appointment has 1,900-3,500 characters. Her insurance and medical sections are empty because there was never anything to parse — the parser worked fine on what it was given. Rafael Paulino (same clinic, 130 characters) has the identical problem.

Cause: the booking webhook arrived before the intake form fields were attached to the GHL contact, so only the address block came through. When the fuller payload arrived later, the handler skipped it — the merge rule only appends GHL data when the stored notes do **not** already contain `**Contact:**`. The 91-character stub contains that marker, so the record was permanently locked to the stub.

On the approved tag: the tag stamp on Kristy's record is 19:41 UTC, which is when the setter pressed Approve — the portal did not tag her early. The retry sweep is also correctly restricted to already-approved rows. So the clinic's early alert did not come from the portal's approved tag on this record. We cannot currently prove where it did come from, because tag pushes are not logged, so the plan adds that evidence trail plus a hard guard.

## What to fix

### 1. Recover Kristy Theodore now
Re-pull her full GHL contact record, rebuild her intake notes from the contact custom fields, and re-run the parser so demographics, insurance, medical, and pathology populate. Her corrected DOB (1979-06-01) stays as is.

### 2. Stop the stub from locking the record
Change the notes merge rule: instead of "skip if the stored notes already mention Contact", compare content. Incoming GHL notes are merged when they contain sections the stored notes lack (Insurance, Medical, Pathology, Primary Care) or are substantially longer. The stored notes are never shortened, and clinic-entered content is never removed.

### 3. Sweep the existing stubs
One-off recovery pass across all projects for appointments that have intake notes shorter than ~300 characters while a GHL contact exists: re-fetch the contact, rebuild notes, clear the parse stamp so the parser reruns. Report how many were recovered per clinic.

### 4. Guard and log the approved tag
- Hard guard: refuse to push the `approved` tag when the appointment's review status is not `approved`. Any blocked attempt is logged.
- Every approved-tag push writes an entry to the appointment's notes/audit trail with who or what triggered it (manual approve, setter-submitted auto-approve, retry sweep). Next time a clinic is alerted early, the origin is provable from the record instead of guesswork.

## Technical notes

- Recovery uses the existing `fetch-ghl-contact-data` function followed by clearing `parsing_completed_at` so `auto-parse-intake-notes` reprocesses the row.
- The merge change is in `mergeGhlDataIntoExisting` in `supabase/functions/ghl-webhook-handler/index.ts` (the `patient_intake_notes` branch that checks `includes('**Contact:**')`).
- The sweep runs as a new admin-invoked edge function using `EdgeRuntime.waitUntil()` with batching, so it does not hit the 60s limit.
- The tag guard goes in `update-ghl-contact-tags`: when the payload contains `approved`, look up the appointment by `ghl_contact_id` and reject if no approved row exists. Callers are `ReviewQueue.tsx`, `ghl-webhook-handler`, and `retry-missing-ghl-approved-tags` — all three already only fire post-approval, so the guard is a safety net plus audit trail.
- Separately worth checking on the GHL side: whether Vivid Vascular has a workflow that notifies the clinic on booking, independent of the `approved` tag. That path is outside the portal and cannot be fixed from here.
