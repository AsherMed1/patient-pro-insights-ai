# Richmond Vascular Center: "patients with no date and time"

## What the data actually shows

I checked every Richmond Vascular Center record before writing this plan:

- 1,019 total appointments; exactly **one** has no date/time — Ashley Caldwell, created Jan 30, 2026 (calendar "Unknown", no GHL appointment ID). Nothing recent.
- The last 30 days: 154 appointments, **all** with both a date and a time.
- Richmond is not an unscheduled-capture project (no `time_preference` rows), and no leads are landing without appointments.

So the missing date/time the clinic sees is almost certainly a **display** problem, not missing data. Two concrete causes are visible in the code and configuration:

1. **Timezone mismatch.** Richmond's project timezone is `US/Eastern`, but the portal formats every appointment date and time in hard-coded Central Time (`formatDate`/`formatTime` in `src/components/appointments/utils.ts` → `formatDateInCentralTime` in `src/utils/dateTimeUtils.ts`). The project timezone is fetched but only used for the "Created" stamp. A 9:00 AM Eastern appointment displays as 8:00 AM, and evening slots can roll to the wrong calendar day — which reads to a clinic as "the date/time is wrong or missing".
2. **"Not set" fallbacks fire on empty values, not just nulls.** Every date/time render guard uses a truthy check, and the formatters return the literal string `Not set` for any falsy input. Any row that ever carries an empty string instead of null shows "No appointment date/time set" even though the column has a value.

There is also noise the clinic may be reading as bad records: rows named **"Reserved"** and **"Reserved - RVC Booked"** (time blocks created from the portal) exist as approved appointments in Richmond and show up alongside real patients.

## Plan

### Step 1 — Confirm what the clinic is looking at (first, before any fix)
- Pull the Richmond portal view as the clinic sees it and compare each row's displayed date/time against the stored value, to confirm the Eastern/Central shift is what they're reporting.
- Check whether "Reserved" block rows are visible in their appointment list, since those look like patients with no real appointment.
- If neither matches, ask the clinic for one patient name so we can trace that exact record.

### Step 2 — Render appointment dates/times in the project's timezone
- Thread the already-fetched project timezone into the date/time formatting instead of hard-coding `America/Chicago`, so Richmond shows Eastern times. Keep Central as the fallback when a project has no timezone set.
- Apply this consistently in the appointment card, the detailed view, and the reschedule dialog summary so the same value shows everywhere.

### Step 3 — Stop false "Not set" / "No appointment date/time set" states
- Treat empty strings the same as real values are treated: normalize blank/whitespace values before the render guards, and only show the "no date" message when the record genuinely has no date and no time.
- Make the fallback text clearer ("Not scheduled") so a formatting failure isn't mistaken for missing data.

### Step 4 — Separate reserved blocks from patients
- Ensure the "Reserved" / "Reserved - RVC Booked" time-block rows are excluded from (or clearly labelled in) the clinic-facing appointment list for Richmond, the same way reserved blocks are filtered elsewhere.

### Step 5 — Fix the one genuinely broken record
- Repair or retire Ashley Caldwell (Jan 30, 2026), the single Richmond row with no date/time and no GHL appointment ID.

## Technical notes

- Files: `src/components/appointments/utils.ts` (`formatDate`, `formatTime`), `src/utils/dateTimeUtils.ts` (`formatDateInCentralTime`, `formatInCentralTime`), `src/components/appointments/AppointmentCard.tsx` (date/time block, reschedule summary), `src/components/appointments/DetailedAppointmentView.tsx` (summary chips, reschedule summary).
- Project timezone already available through `src/utils/projectTimezoneCache.ts`; no schema change needed.
- No database migration required for steps 2–4; step 5 is a single-row data fix.
