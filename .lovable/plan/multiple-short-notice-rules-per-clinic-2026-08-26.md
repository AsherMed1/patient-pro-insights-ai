# Multiple short-notice rules per clinic

Today each clinic has exactly one notice value (`projects.short_notice_threshold_hours`), so Rao Clinic can't have GAE at 36h and Neuropathy at 84h, and Nashville can't run 60h for Nashville/Hendersonville while Bowling Green needs 132h. This adds per-service-line and per-location rules on top of the account-level value, and uses them everywhere short notice is evaluated.

## How it works for the user

In the clinic's settings dialog, below the existing "Short Notice Alert Threshold", a new **Notice rules** section lists the clinic's rules:

```text
Service line        Location          Required notice
GAE                 (any)             36 hours
Neuropathy          (any)             84 hours
(any)               Bowling Green     132 hours
--------------------------------------------------
Account default                       60 hours
```

- Add a rule by choosing a service line (multi-select, same picker style as the OON insurance rules), a location, or both, plus the hours.
- Rules can be edited, deactivated, or deleted at any time; the account-level value stays as the fallback and is never overwritten.
- Most specific rule wins: service line + location, then service line only, then location only, then the account default.

Every place that already computes short notice switches to the resolved rule:

- Review Queue countdown badges, "Short Notice" filter, and Pending sort order.
- The Slack alert fired at booking, and the 15-minute Pending sweep.
- The alert message gains the clinic, service line, location, required notice, and actual notice given — e.g. "Rao Clinic · Neuropathy · Katy — required 84 biz hrs, provided 31 biz hrs".

Nothing that is currently alerting stops alerting: a clinic with no rules behaves exactly as it does now.

## Technical notes

**Schema** — new `public.project_short_notice_rules`: `project_name` (text), `service_line` (text, nullable), `location` (text, nullable), `threshold_hours` (int), `is_active` (bool default true), `note`, timestamps + update trigger. Unique on `(project_name, coalesce(service_line,''), coalesce(location,''))`. Grants: select/insert/update/delete to `authenticated` (admins manage, all portal users read for countdowns), all to `service_role`; RLS mirrors the read policy already used for `projects.short_notice_threshold_hours` so non-admin setters can still read thresholds.

**Resolution helper** — `resolveShortNoticeThreshold(rules, { serviceLine, location, calendarName }, accountDefault)` added to `src/lib/shortNotice.ts`, with a mirrored copy in `supabase/functions/_shared/short-notice-rules.ts`. Matching reuses the normalize/contains semantics from `src/lib/oonMatching.ts` (location matched against `calendar_name`, service line against the parsed procedure via `serviceLineFromAppointment`, falling back to the calendar name). Specificity score: both = 3, service line = 2, location = 1, default = 0; ties break on the lowest hours.

**Consumers**
- `supabase/functions/ghl-webhook-handler/index.ts` — `checkShortNoticeAlert` loads the clinic's active rules alongside the project row and resolves the threshold before comparing; passes `thresholdHours`, `serviceLine`, `location` in the invoke body.
- `supabase/functions/sweep-short-notice-pending/index.ts` — same resolution per row, batch-loading rules for all candidate projects.
- `supabase/functions/notify-slack-short-notice/index.ts` — renders the new fields in the Slack block and stores `threshold_hours` on the `short_notice_alerts` row (new nullable column) for auditability.
- `src/components/admin/ReviewQueue.tsx` — the per-project threshold map becomes a per-row resolved threshold using the same helper.
- `src/components/projects/EditProjectDialog.tsx` — new rules editor; the existing account-level dropdown is relabelled "Default notice (used when no rule matches)".
