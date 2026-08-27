# Recapture Setter Activity Report

Add a second report view inside Recapture Worklist → Reports: **Setter Activity**, mirroring the QA Specialist Activity report but driven by setter actions on Recapture records. The existing recapture report stays as-is behind a toggle (Overview | Setter Activity).

## Why a new activity log is needed

Recapture today stores only the *latest* state on each case (`opened_at`/`opened_by`, `assigned_user_id`, `work_status`, `completed_at`/`completed_by`, `follow_up_at`) plus one row per outreach attempt in `recapture_attempts`. That means outreach attempts are already full history, but opens, claims, follow-up scheduling and completions are overwritten each time. To meet "each action remains a separate historical entry", the plan adds an append-only activity table and writes to it wherever the worklist changes a case.

Historic data: outreach attempts are fully reportable back to day one; opens/claims/completions before this change are back-filled once as a single derived row each from the case's stored timestamps.

## Report location

Recapture Worklist → Reports → toggle: **Overview** (existing) | **Setter Activity** (new).

## Filters

- Date from / date to (calendar pickers) with quick presets: Today, Yesterday, This Week, This Month.
- Start / end time of day (HH:MM, default 00:00–23:59), applied to every day in the range.
- Clinic, setter, recapture bucket (New, Opened, Nurture, Follow-Up, Completed), outreach method (Call, Text, Email), attempt outcome, action type.
- All timestamps counted, filtered and displayed in Central Time.

## Summary cards

Setters active · Unique records opened · Records claimed/assigned · Outreach attempts logged · Follow-ups scheduled · Records completed · Total actions logged.

## Setter summary table

One row per setter: Setter · Unique records opened · Records claimed · Calls · Texts · Emails · Follow-ups scheduled · Records completed · Total actions. Plus a totals row.

## Detailed activity

Grouped by record (collapsible, same pattern as QA Specialist Activity), newest first, paginated:

Setter · Patient (clickable, opens the Recapture case drawer over the report) · Clinic · Bucket · Opened at · Claimed at · Outreach method · Attempt outcome · Completion outcome · Completed at · Time open → complete · expandable full action list.

## Action types logged

| Action | Source |
| --- | --- |
| Opened | case opened (work_status new → opened) |
| Claimed / Assigned | `assigned_user_id` set or changed |
| Attempt Logged | each `recapture_attempts` row (channel + result + conversation outcome) |
| Follow-Up Scheduled | `follow_up_at` set or changed |
| Completed | work_status → completed (with completion reason) |
| Reopened | completed → any non-completed status |
| Note / Other | remaining case updates |

## Exports

Refresh, Export to CSV (detailed log), Export to Excel (Summary sheet + Detailed Log sheet). Both respect every active filter.

## Technical notes

- Migration: new table `public.recapture_case_activity` (`id`, `case_id` FK → `recapture_cases`, `activity_type`, `description`, `channel`, `result`, `conversation_outcome`, `actor_user_id`, `actor_name`, `created_at`), with GRANTs to `authenticated`/`service_role`, RLS enabled, and access gated by the existing `public.has_recapture_case_access` function (select + insert). Index on `(created_at)` and `(case_id)`.
- One-time backfill insert deriving `opened`, `claimed`, `completed` rows from existing `recapture_cases` timestamps and `attempt` rows from `recapture_attempts`, so the report is populated on day one.
- Instrument writes: `RecaptureCaseDrawer.tsx` (open handler ~line 145, attempt insert ~line 246, case update ~line 318) and `RecaptureQueue.tsx` (case update ~line 305) each insert a matching activity row alongside the existing update.
- New component `src/components/recapture/RecaptureSetterActivity.tsx`; `RecaptureReports.tsx` gets the Overview | Setter Activity toggle.
- Data: paginated fetch of `recapture_case_activity` between range bounds, joined in memory to `recapture_cases` (project, patient, bucket, completion reason, follow-up) and `profiles` for setter names; time-of-day filtering applied client-side after converting to Central Time via `formatInTimeZone`.
- Visibility follows existing recapture rules: admins/management see all clinics; recapture/review-only roles are scoped to their assigned projects.
- Patient click opens the existing `RecaptureCaseDrawer` in an overlay so the user never leaves the report.

## Validation

Log an open, a call attempt, a follow-up and a completion on a test case, then confirm each appears as its own row, the summary counts reconcile with the detailed log, and CSV/Excel exports match the filtered view.
