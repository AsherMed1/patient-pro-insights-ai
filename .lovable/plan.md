# QA Operations Queue — Short Implementation Update

A centralized QA workspace is now built into the PatientPro Portal for managing appointment-quality alerts and tracking resolution performance.

## What shipped

1. **Dedicated QA workspace**
   - New **QA Operations** tab is available for Admins, Agents, and the new `qa_specialist` role.
   - QA specialists see a focused, stripped-down layout containing only the queue.
   - Access is project-scoped using the existing `project_access` pattern.

2. **Case workflow statuses**
   - New, In Review, Pending / Escalated, Reopened, Completed.
   - Each status has its own tab with a count badge and shared search/filters.

3. **Automatic case ingestion**
   - Cases are created automatically from:
     - short-notice alerts,
     - OON status transitions,
     - Cancelled or No Show transitions when the appointment was previously Confirmed.
   - Each case carries patient, project, service line, appointment date, alert reason, and current appointment status.

4. **Case detail drawer**
   - Full patient and appointment context.
   - Internal threaded notes with author attribution.
   - Auto-generated activity log for status changes, notes, and ticket actions.
   - One-click link back to the related appointment in the project portal.

5. **ControlHub ticket creation**
   - Dedicated edge function `create-controlhub-ticket`.
   - Stub mode records the ticket creation in the activity log today.
   - Live mode pushes to ControlHub once the API endpoint and key are added as secrets; returned ticket ID is stored on the case and surfaced in the queue list.

6. **Access control and auditability**
   - New `qa_specialist` role and `qa_cases`, `qa_case_notes`, `qa_case_activity` tables, all with RLS.
   - QA specialists see only cases for their assigned projects; Admins/Agents see all cases.
   - Every status change, note, and ticket creation is timestamped and attributed.

## To go live

1. Assign `qa_specialist` role to the Quality Specialists and grant them project-scoped access.
2. Provide ControlHub API endpoint and API key so ticket creation can switch from stub to live mode.

## Files touched

- Database: new `qa_cases`, `qa_case_notes`, `qa_case_activity` tables and ingestion triggers.
- Supabase Edge Function: `supabase/functions/create-controlhub-ticket/index.ts`.
- Frontend: `src/components/admin/QAOperationsQueue.tsx` and `src/pages/Index.tsx`.
- Auth/roles: `src/hooks/useRole.tsx` updates for `qa_specialist`.
