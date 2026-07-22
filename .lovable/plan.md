## Issue: Earl A Chestnut shows 3 different appointment times

- **Client portal:** Jul 30, 2026 10:30 AM
- **QA Operations drawer:** Jul 30, 2026 5:30 AM
- **GHL:** Jul 31, 2026 11:30 AM (EDT)

I confirmed two distinct problems in the data.

---

### Part 1 — QA Operations timezone bug (root cause identified, safe to fix)

`qa_cases` for this appointment stores `appointment_date = 2026-07-30 10:30:00+00` (UTC). The portal-correct value is `2026-07-30 10:30 America/New_York` (= `14:30 UTC`). So it's stored 4 hours early, then rendered in the viewer's browser timezone — that's why it displays as `5:30 AM` (browser is on CDT/UTC‑5).

The bug is in the trigger `public.qa_ingest_confirmed_audit` (and the equivalent line in the other QA ingest triggers):

```sql
appt_ts := (NEW.date_of_appointment::text || ' ' || COALESCE(NEW.requested_time, '00:00:00'))::timestamptz
```

Casting `text → timestamptz` uses the **session timezone (UTC on the server)**, not the project's timezone. So `10:30` local wall‑clock is misinterpreted as `10:30 UTC`.

**Fix**
1. Update `qa_ingest_confirmed_audit`, `qa_ingest_review_queue`, `qa_ingest_short_notice`, `qa_ingest_oon` (any that build `appt_ts` from `date_of_appointment + requested_time`) to convert using the project timezone:
   ```sql
   SELECT timezone INTO proj_tz FROM public.projects WHERE project_name = NEW.project_name;
   appt_ts := ((NEW.date_of_appointment::text || ' ' || COALESCE(NEW.requested_time,'00:00:00'))::timestamp)
              AT TIME ZONE COALESCE(proj_tz, 'America/Chicago');
   ```
2. Backfill `qa_cases.appointment_date` for existing open rows using the same formula (join `projects` for tz).
3. Delete the stray duplicate `qa_cases` row for Earl (one row has `10:30 UTC`, another has `00:00 UTC` from an earlier ingest before `requested_time` was set).

No UI changes needed — `format(new Date(...), 'PP p')` in `QAOperationsQueue.tsx` is correct once the stored value is a true UTC instant.

---

### Part 2 — Portal vs GHL date mismatch (needs investigation, no code change yet)

Portal has `date_of_appointment = 2026-07-30, requested_time = 10:30`. GHL shows `Jul 31, 11:30 AM EDT`. This is a **different day and time**, not a timezone shift — so it's the same class of issue we've seen before where a GHL "Appointment Updated" webhook never reached the portal (Lawrence Luczak, Sarella Kately, etc.).

Proposed investigation steps (read‑only, before proposing a fix):
- Query GHL for appointment `DfDOfeHtPiBTM0ytTRmT` (Earl's `ghl_appointment_id`) and compare `startTime` to portal.
- Inspect `ghl_webhook_logs` / edge function logs for this appointment id around the reschedule time to confirm whether the webhook arrived and was rejected/silently dropped, or never arrived.
- If webhook arrived but was rejected: patch the specific guard in `ghl-webhook-handler`. If webhook never arrived: repair this record via `backfill-ghl-appointment` and log as another instance of the missed‑webhook pattern for follow‑up.

I'll report findings and only then propose a targeted fix — I do not want to change reschedule logic based on assumptions.

---

### Deliverables in build mode

1. Migration updating the QA ingest trigger functions to use project timezone.
2. Migration backfilling `qa_cases.appointment_date` for non‑completed rows.
3. Cleanup of the duplicate `qa_cases` row for Earl Chestnut.
4. Diagnostic run against GHL + webhook logs for `DfDOfeHtPiBTM0ytTRmT`, then a follow‑up plan for Part 2.
