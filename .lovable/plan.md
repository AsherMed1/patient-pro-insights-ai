## Problem

Gary Jones (TVI) was declined in the Review Queue. Once declined, an appointment is hidden from every portal view forever, with no UI to undo it. Admins assume declined rows will "come back" if the setter reschedules in GHL — but that only triggers if the same `ghl_appointment_id` receives a new `date_of_appointment` from GHL. If the setter cancels and re-creates, or simply hasn't rescheduled yet, the declined row stays invisible. The Slack message from Isis describes the same recovery gap.

The existing webhook already re-opens `declined → pending` when GHL sends a new date for the same appointment (`ghl-webhook-handler/index.ts` lines 865–873), so the gap is purely UI — admins have no way to view or restore mistakenly-declined appointments.

## Plan

Add a **Declined** view to the Review Queue with a one-click **Restore to Queue** action.

### 1. Add a status tab/toggle at the top of `src/components/admin/ReviewQueue.tsx`
- New local state `queueView: 'pending' | 'declined'` (default `'pending'`).
- Render two pill buttons / a small `Tabs` next to the existing project filter: **Pending Review** (current behavior) and **Declined**.
- `fetch()` swaps the `.eq('review_status', ...)` value based on `queueView`. The exempt-project filter and search/project filters remain unchanged.
- The Declined view sorts by `reviewed_at desc` (most recently declined first) and shows the reviewer name + decline date in the row header.

### 2. Add a Restore action (Declined view only)
- In each declined row, replace the Approve / Decline / OON buttons with a single **Restore to Review Queue** button (and keep "View details").
- Clicking it:
  - Updates `all_appointments`: `review_status = 'pending'`, `reviewed_at = null`, `reviewed_by = null`, `review_notes = null`.
  - Inserts an `appointment_review_history` row with `action = 'restored'`, `prior_status = 'declined'`, actor info, and optional note.
  - Logs an audit event `review_restored` with the patient name and actor.
  - Refreshes the list and toasts "Restored to Review Queue".
- No GHL side effects (no tag changes, no status flips). Status column is left as-is — if GHL had set it to Cancelled (as in Gary's case), the admin can re-evaluate from the pending queue and approve/decline/OON again.

### 3. Header counts
- Show counts for both views (`Pending (N)` / `Declined (N)`) using a lightweight `count: 'exact', head: true` query alongside the main fetch so admins can see at a glance whether anything is sitting in Declined.

### 4. No backend / schema changes
- `appointment_review_history.action` is already free-text (the existing code writes `'approved' | 'declined' | 'oon'`), so `'restored'` requires no migration.
- The webhook's existing auto re-open on GHL reschedule stays untouched.

### Verification
- Open Review Queue → switch to **Declined** tab → Gary Jones (TVI) appears with reviewer name and decline timestamp.
- Click **Restore to Review Queue** → row disappears from Declined, reappears in Pending, `appointment_review_history` shows a `restored` entry, audit log shows `review_restored`.
- Switching back to Pending and approving works exactly as before.

### Files touched
- `src/components/admin/ReviewQueue.tsx` (only file)
