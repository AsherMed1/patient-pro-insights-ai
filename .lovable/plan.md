## Problem

When a lead already has an active appointment in the portal and a new record for the same contact sits in the Review Queue, clicking **Approve** currently leaves **both rows active**. The existing one is not superseded because:

- `ghl-webhook-handler/supersedeOlderContactRows` only runs on new GHL booking events.
- `mark_superseded_on_change` only fires on `status` column changes, not `review_status`.
- `ReviewQueue.tsx/performAction` only updates `review_status` to `approved` and pushes the `approved` GHL tag.

The duplicate banner offers **Replace** (deletes the old row) and **Keep Existing** (dismisses the new row), but a plain **Approve** creates a duplicate active record.

## Goal

Make Review Queue approval automatically supersede older active sibling records for the same contact/project, so the portal always surfaces exactly one active row per contact per project after approval.

## Plan

### 1. Database trigger on `review_status` approval

Create a new migration that adds `trg_supersede_on_review_approval` on `public.all_appointments`:

- Fire `BEFORE UPDATE OF review_status` when `NEW.review_status = 'approved'` and `OLD.review_status = 'pending'`.
- Skip if `NEW.is_superseded = true` or `NEW.is_reserved_block = true`.
- Find older active sibling rows in the same `project_name` with the same `ghl_id` (or matching `lead_phone_number` + normalized `lead_name` when `ghl_id` is null).
- "Older active sibling" means: `is_superseded = false`, `is_reserved_block = false`, status is non-terminal, `review_status` is `approved` or null (not `pending`), and `created_at < NEW.created_at`.
- Mark those siblings `is_superseded = true` and `updated_at = now()`.
- Insert an `appointment_notes` row on each superseded record: "Superseded by newer approved Review Queue appointment {NEW.id} on {date} — System".

This mirrors the existing webhook superseding rules and keeps history non-destructive.

### 2. Update Review Queue UI to match the new behavior

In `src/components/admin/ReviewQueue.tsx`:

- Keep the duplicate detection banner so admins still see that an existing record exists.
- Change the **Replace** button so it triggers a normal **Approve** (the trigger will supersede the old row) and then, optionally, copies the old slot to the new row if the admin wants to preserve the appointment time. Stop hard-deleting the old rows via `handleReplaceExisting`; instead, rely on the trigger for superseding and only delete if the user explicitly chooses "Use this slot" and the old row is truly redundant after slot adoption.
- Keep **Keep Existing** as-is (dismisses the new row).
- Plain **Approve** now safely supersedes older active siblings automatically.
- Add a toast note when duplicates were superseded: "Approved and superseded N existing appointment(s)."

### 3. Audit logging

Ensure each auto-supersede writes:

- An `appointment_notes` audit note on the superseded row (see step 1).
- An `audit_logs` event via `log_audit_event` from the frontend/trigger describing the approval and how many rows were superseded.

### 4. Backfill verification (read-only)

After deployment, query active duplicate groups where both `review_status = 'approved'` and `review_status = 'pending'` exist for the same contact/project. This will confirm the trigger is firing and identify any stragglers that were approved before the fix.

### 5. Documentation update

Update `.lovable/memory/data-integrity/one-active-row-per-contact.md` to note that Review Queue approvals also trigger superseding, not just GHL webhook bookings.

## Outcome

Approving a Review Queue record will behave like a new GHL booking: older active portal rows for the same contact/project are superseded automatically, the portal shows only the newest approved row, and history is preserved in the Activity timeline.

## Questions

1. Should the trigger also supersede older rows when the new appointment date is **in the past** relative to the existing active row, or should it always supersede the older `created_at` row regardless of appointment date?
2. Do you want to keep the **Replace** button label, or rename it to **Approve & Supersede** now that the behavior is automatic?
3. Should the same auto-supersede logic apply when a row is marked **OON** from the Review Queue, or only on **Approve**?