# Short-Notice Alert Threshold: per location and per procedure

Today each clinic has one Short-Notice threshold (`projects.short_notice_threshold_hours`, e.g. Nashville Vascular = 60h) applied to every booking. This adds optional override rules so a clinic can set different thresholds per location (Nashville vs Hendersonville vs Bowling Green) and per procedure (GAE, PAE, UFE, ...), while keeping the existing project-wide value as the default.

## How it will work

- The project edit dialog keeps the current dropdown, relabelled **Default threshold (all locations & procedures)**.
- Below it, a new **Threshold overrides** list. Each row is: Location (or "Any location") + Procedure (or "Any procedure") + threshold, with add/remove buttons.
  - Location choices come from the clinic's existing calendar-derived locations (for Nashville Vascular: Nashville, Hendersonville, Bowling Green, plus Virtual when present).
  - Procedure choices come from the canonical service lines already used elsewhere (GAE, PAE, PFE, UFE, FSE, PAD, HAE, ATE, TAE, Neuropathy).
- Matching precedence when an appointment is evaluated:
  1. Location + procedure exact match
  2. Location only
  3. Procedure only
  4. Project default
  A rule set to Disabled turns short-notice alerting off for that slice only.
- Everything that uses the threshold picks up the override: booking-time Slack alerts, the 15-minute Pending sweep, the Review Queue countdown/badges, and the appointments API.

## Example (Nashville Vascular & Vein Institute)

```text
Default:                              60 hours
Hendersonville / Any procedure:       36 hours
Nashville / PAE:                     120 hours
```
A GAE booking in Nashville uses 60h; a PAE booking in Nashville uses 120h; anything in Hendersonville uses 36h.

## Technical details

- New table `public.project_short_notice_rules`: `id`, `project_name text not null`, `location text null`, `service_line text null`, `threshold_hours int not null`, `created_at/updated_at`, unique on `(project_name, coalesce(location,''), coalesce(service_line,''))`. GRANTs: `select` to `authenticated`, `all` to `service_role`; RLS — read for authenticated, write for admins via `has_role(auth.uid(),'admin')`.
- Shared resolver:
  - `src/lib/shortNotice.ts` gains `resolveThreshold(rules, location, serviceLine, projectDefault)`; location comes from `extractLocationFromCalendarName` (LocationLegend) and procedure from `serviceLineFromAppointment` (`src/lib/serviceLines.ts`).
  - Mirrored in `supabase/functions/_shared/shortNoticeRules.ts` with the same regex-based location extraction and service-line normalization, so backend and portal agree.
- Consumers updated to fetch the rules alongside the project row and call the resolver instead of reading `short_notice_threshold_hours` directly:
  - `supabase/functions/ghl-webhook-handler/index.ts` (`checkShortNoticeAlert`)
  - `supabase/functions/sweep-short-notice-pending/index.ts`
  - `supabase/functions/update-appointment-fields/index.ts`
  - `supabase/functions/all-appointments-api/index.ts`
  - `src/components/admin/ReviewQueue.tsx` (per-project threshold map becomes per-project + rules; countdown uses the resolved value per row)
- `EditProjectDialog.tsx` / `ProjectsManager.tsx`: render and persist the override rows (delete-then-insert on save); the existing hour options list is reused for rule thresholds.
- No change to alert formatting, Slack payloads, or resolution logic.
