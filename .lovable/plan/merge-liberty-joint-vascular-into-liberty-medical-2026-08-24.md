# Merge Liberty Joint & Vascular into Liberty Medical

## What's happening now

Both clinics are the same GHL sub-account (`OTaY0EuvYFU62nkd8vyw`). When the clinic renamed itself in GHL, the portal auto-created a second project:

- **Liberty Joint & Vascular** — created Feb 5, the real project: webhook configured, 36h short-notice threshold, America/New_York timezone, 348 appointments, 209 QA cases, 66 recapture cases, 28 short-notice alerts, 5 user access grants.
- **Liberty Medical** — created today by the auto-create rule: no webhook, default 72h threshold, America/Chicago timezone, 1 appointment.

So this is a rename, not a two-clinic merge: keep the established project and its settings, retitle it, and fold the new stray row into it.

## Plan

1. Rename the established project row to **Liberty Medical**, keeping its webhook URL, 36h short-notice threshold, America/New_York timezone, GHL location ID, and all 5 user access grants.
2. Move all historical records from `Liberty Joint & Vascular` to `Liberty Medical`: appointments, QA cases, recapture cases, short-notice alerts, and any other project-scoped rows keyed by project name. Nothing is deleted — the 348 appointments stay intact and stay searchable, just under the new name.
3. Delete the duplicate project row created today. Its single appointment already carries the name `Liberty Medical`, so it lands on the surviving project automatically.
4. Verify afterwards: one Liberty project exists, zero records still reference the old name, counts add up to 349 appointments, and clinic users still see their portal.

## Technical notes

- Order matters: `projects.project_name` is unique, so the duplicate row is deleted (or temporarily renamed) before the surviving row is renamed to `Liberty Medical`.
- Data moves happen in a single SQL statement set covering `all_appointments`, `qa_cases`, `recapture_cases`, `short_notice_alerts`, plus a sweep of remaining `project_name`-keyed tables (`new_leads`, `all_calls`, `campaign_performance_facts`, `cpl_data`, `speed_to_lead_stats`, `agent_performance_stats`, `revenue_projections`) — each updated only where a Liberty row actually exists.
- Two legacy migration files reference the literal `'Liberty Joint & Vascular'`; those are already-applied historical migrations and are left untouched.
- No source code hardcodes the old name, so no frontend changes are needed.
- Because the GHL sub-account is now named "Liberty Medical", inbound webhooks will map cleanly to the renamed project and no further auto-created duplicates should appear.

## Open question

If the clinic also wants the old name kept visible anywhere (for example on historical reports), say so — otherwise everything reads as "Liberty Medical" after this change.
