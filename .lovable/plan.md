# Fix blank patient records (Ross Becker / ECCO Medical)

## What happened

Ross Becker's record was created from a GHL webhook that only carried the address-bot and insurance-upload fields. The stored intake notes are 198 characters:

```text
**Contact:** address: 9313 Rogers Road | city: Longmont | state: Colorado | zip: 80503
**Insurance:** insurance_id_link: https://services.leadconnectorhq.com/documents/download/...
```

There is no transcript, no insurance plan, no pathology — so the parser had nothing to work with, and because the record also arrived without a calendar name, no service could be inferred either. The record is not corrupted; it was never filled in.

This is a recurring pattern, not a one-off. In the last 60 days there are **17 patient records** in this stub state (excluding reserved time blocks), including 5 created on Aug 15 alone across ECCO Medical, Champion Heart, Georgia Endovascular, Rao Clinic and Vascular and Embolization Specialists. Every one of them has a GHL contact ID, so the missing data is almost certainly still sitting in GHL and can be pulled back.

The existing `recover-stub-intake-notes` function already knows how to repair these records, but nothing ever runs it — it has to be triggered by hand, so stubs sit blank indefinitely.

## What changes

1. **Self-heal right after creation.** When the webhook creates or updates a record and the resulting intake notes are still a stub (under ~300 chars, no Pathology/Medical/STEP sections), schedule a background re-pull of the full GHL contact a short time later (and one retry), so a record that arrives before the intake form is attached fills itself in within minutes instead of never.

2. **Scheduled safety net.** Add a cron job (every 2 hours) that calls `recover-stub-intake-notes` for records created in the last 14 days. Anything the immediate retry misses gets swept up automatically, then re-parsed.

3. **Service recovery for records with no calendar.** For stub records with a null calendar name (Ross Becker's case), resolve the calendar from the contact's GHL appointment during the recovery pass, then infer the procedure from the calendar name using the existing detection rules.

4. **Make blankness visible instead of silent.** In the appointment detail view, when a record has stub-level intake notes show an "Intake data not received" indicator with a "Pull from GHL" button that runs `fetch-ghl-contact-data` on demand, so a setter is never left staring at an empty card without an action.

5. **Backfill.** Run the recovery once over the existing 17 stub records, then clear their parse stamps so the parser reprocesses them. Ross Becker is included.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: add an `isStubNotes()` helper (length threshold + absence of the section markers already listed at line 2183) and, on create/update paths, wrap a delayed `fetch-ghl-contact-data` invoke in `EdgeRuntime.waitUntil()` with a single retry. Guard against loops by only retrying when the record has a `ghl_id` and notes are still a stub at retry time.
- `supabase/functions/recover-stub-intake-notes/index.ts`: add a `created_within_days` filter, exclude reserved time-block rows (`lead_name ilike 'Reserved%'` / notes starting with `Time block reserved`), and after a successful re-pull, if `calendar_name` is null, resolve it from the contact's GHL appointments and set `parsed_pathology_info.procedure` from the calendar-name detection.
- Cron: new migration adding a `cron.schedule` entry that posts to `recover-stub-intake-notes`, matching the existing pattern used by `sweep-short-notice-pending` (jobid 2).
- UI: `src/components/appointments/DetailedAppointmentView.tsx` — stub banner plus "Pull from GHL" action reusing the existing refresh pipeline (fetch → clear `parsing_completed_at` → auto-parse).
