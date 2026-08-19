# Trainee Submitted — Portal side of the workflow

This is the Portal scope needed before the GHL team adds their checkpoints. It mirrors the existing Setter Submitted / Patient Submitted setup.

## How it works today (confirmed in code)

- GHL sends an **Insurance Intake Source** custom field on the contact/appointment webhook.
- `ghl-webhook-handler` normalizes it to `setter_submitted` or `patient_submitted` (anything else / missing → treated as unspecified).
- `setter_submitted` → appointment is created `review_status = 'approved'` and the `approved` tag is pushed to the GHL contact; it goes straight into the clinic-facing workflow.
- Anything else → `review_status = 'pending'`, appointment lands in the Review Queue and stays hidden from every client portal until an admin approves.
- The Review Queue has four buckets: **New**, **Pending Review**, **Declined**, **Approved** (`review_status` + `review_stage`).

## What the GHL team needs from us (the short answer for Mohsin)

Add **Trainee Submitted** as a third option on the same *Insurance Intake Source* field. No new field, no new webhook. The Portal will recognize the value, route the lead to a Trainee Review bucket, and — only on approval — apply the `approved` tag that their existing workflow already listens to. Their clinic alert stays gated behind that same tag, so nothing changes on their end beyond adding the option value and the trainee-facing checkpoint.

## Portal work

### 1. Recognize the new intake source
- Extend the intake-source parser to return `trainee_submitted` when the field value contains "trainee".
- Trainee-submitted appointments are created `review_status = 'pending'` with a new stage value `review_stage = 'trainee'` (never auto-approved).
- Persist the intake source on the appointment row so the queue can filter on it and reports can slice by it.

### 2. Trainee Review bucket in the Review Queue
- Add a fifth bucket button, **Trainee Review (n)**, alongside New / Pending Review / Declined / Approved, with its own live count.
- Same row UI, search, project filter, duplicate detection, DOB warnings, short-notice badges and expansion as the other buckets.
- Row actions: **Approve** (identical to today's approve — sets `review_status='approved'`, fires the `approved` GHL tag, makes it clinic-facing), **Return for correction**, plus the existing Decline / OON paths.

### 3. Return for correction
- New action with a required free-text reason and a short checklist of what was wrong (date/time vs clinic rules, procedure/service line, demographics, insurance, notes/documentation).
- Sets the record to a `returned` state: stays out of the clinic portal, stays visible to the trainee and reviewers.
- Writes an internal attributed note ("Returned for correction by {name}: …") and pushes a `trainee-correction-needed` tag to the GHL contact so the trainee sees it in HL. The `approved` tag is only ever added after a real approval.
- Reviewer can re-approve after the trainee fixes it; each cycle is logged.

### 4. Access control
- Bucket and actions restricted to `admin` plus a new trainer/supervisor capability. Recommended: add a `trainer` role to the `app_role` enum (Jenniffer and supervisors), which grants Review Queue access limited to the Trainee bucket.
- Trainees (existing `review_only` / Setter role) get a read-only **My Submissions** view showing their own trainee-submitted records with status Pending / Approved / Returned + the reviewer's correction notes. They cannot approve.

### 5. Review period (two weeks, extendable)
- New table `trainee_periods` (user, GHL user id, start date, end date, active, extended_by/extended_at, ended_by/ended_at).
- Supervisor UI in User Management: start a period, extend it, or end it early.
- Portal exposes the active-trainee list so GHL can auto-select Trainee Submitted for those setters (or the trainee selects it manually — GHL's choice). When a period ends, new bookings from that setter behave as normal Setter Submitted.

### 6. Reporting
- Trainee tab in QA Reports: submissions per trainee, approved vs returned rate, correction reasons by category, time-to-approve, and trend over the review period — the "ready to graduate" signal the ticket asks for.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: `extractInsuranceIntakeSource` gains `trainee_submitted`; the create branch sets `review_stage='trainee'` and never applies the setter bypass for it.
- `all_appointments`: add `insurance_intake_source text`, allow `review_stage` values `'trainee'` and `'returned'`, plus `returned_reason`, `returned_at`, `returned_by`; index on `(review_status, review_stage)` already exists.
- `src/components/admin/ReviewQueue.tsx`: widen `QueueView` with `'trainee'`, add the bucket button, count query, and the Return-for-correction dialog.
- New `trainee_periods` table with RLS (admins/trainers manage; trainees read their own) and GRANTs.
- `app_role` enum gains `trainer`; `useRole` gets `isTrainer()` / `hasTraineeReviewAccess()`; `AuthGuard` and Review Queue gate on it.

## Open decisions before build

1. Add a real `trainer` role, or treat existing `agent` users as trainers/supervisors?
2. Does "returned for correction" also cancel/hold the GHL appointment, or leave the slot booked while the trainee fixes it?
3. Should the two-week period auto-expire in the Portal, or always require a supervisor to end it?
