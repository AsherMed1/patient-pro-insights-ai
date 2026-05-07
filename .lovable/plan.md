# Premier Vascular — New Patients Not Showing in "New" Tab

## Root cause

Premier Vascular intakes from GHL are intentionally created with `status = 'Pending'` and `is_unscheduled = true` (no date booked — leads choose a time preference instead). This is by design per the Premier capture rule.

However, the appointments tab filter (`src/components/appointments/utils.ts → filterAppointments`) routes ANY `Pending` status to the **Needs Review** tab and explicitly excludes it from **New**:

```
case 'new':
  return ... && !isPendingStatus && ...
case 'needs-review':
  return ... && (isPendingStatus || isInPast || !date_of_appointment) ...
```

So every brand-new Premier lead lands silently in "Needs Review", which is why the client sees the "new patient" email but the New tab is empty until they manually flip the status to Confirmed.

DB confirms: 2 Premier records currently sitting as Pending / is_unscheduled=true / internal_process_complete=false (Priscilla Butler today). Other Premier records that have been manually moved show up correctly.

## Fix

Treat Premier-style **unscheduled Pending** records (`is_unscheduled === true`) as "new" so they appear in the **New** tab on first arrival, while still keeping the existing "needs review" behavior for genuinely stuck appointments (past date, missing date with no `is_unscheduled` flag, etc.) on other projects.

### Changes

1. **`src/components/appointments/utils.ts`** — update `filterAppointments`:
   - `new` tab: include records when `is_unscheduled === true` AND not in a terminal status AND `internal_process_complete !== true`, even if status is Pending.
   - `needs-review` tab: exclude `is_unscheduled === true` Pending records (they belong in New now). Keep Pending routing to Needs Review for non-unscheduled records (so other projects unaffected).

2. **Tab counts** in `AppointmentsTabs.tsx` already derive from the filtered list, so no separate change needed.

3. **Memory update** — revise `mem://projects/premier-vascular/unscheduled-capture`: change "Records route to Needs Review tab automatically" → "Records route to New tab (is_unscheduled=true overrides Pending → Needs Review routing)".

### What is NOT changing

- Webhook still writes `status = 'Pending'`, `is_unscheduled = true` for Premier (preserves Premier's unscheduled-capture intent and keeps EMR auto-queue / short-notice alerts dormant).
- All other projects: Pending continues to route to Needs Review.
- Terminal-status routing, completed tab, and Future tab logic untouched.

## Verification after deploy

- Premier "Priscilla Butler" Pending record should appear in **New** tab on the Premier portal.
- Confirm a non-Premier Pending record (if any) still appears in **Needs Review**.
- New webhook-created Premier lead → lands in New tab without manual status change.
