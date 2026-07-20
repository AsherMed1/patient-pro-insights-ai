# Davis Vein & Vascular: hybrid scheduled + legacy Morning/Afternoon

Davis now books real appointments in GHL, but existing rows already captured as Morning/Afternoon must keep working. Move Davis to a hybrid model driven by whether a real date/time is present on the row.

## Behavior

- **New Davis leads from GHL**: if the payload has a real `date_of_appointment`/`requested_time`, store them exactly like any scheduled project (Ally, VSAV, etc.). If it has none, fall back to the current unscheduled capture (Morning/Afternoon/No Preference, `is_unscheduled=true`, no calendar slot).
- **Existing Davis rows**:
  - Rows with `date_of_appointment IS NULL` keep showing the Time Preference dropdown — unchanged.
  - Rows with a real `date_of_appointment` hide the Time Preference dropdown and show the standard date/time editor even if `is_unscheduled=true` or `time_preference` is set. The dropdown is not driven by project name anymore, it's driven by "does this row have a booked date".

## Code changes

### 1. `supabase/functions/ghl-webhook-handler/index.ts`

Add a helper `payloadHasRealDate(webhookData)` returning true when `date_of_appointment` is a non-empty string.

**CREATE branch (~lines 1185-1220)**: when project is unscheduled-capture AND `payloadHasRealDate` is false, keep today's unscheduled behavior. When it *is* true, treat Davis exactly as a scheduled project for this insert: store the real `date_of_appointment` / `requested_time` / `ghl_appointment_id`, set `is_unscheduled=false`, and skip the forced `time_preference='no_preference'`. Premier / ECCO / Horizon keep the strict unscheduled path (they are not switching), so gate the "accept real date" branch on `project === 'davis vein & vascular'`.

**UPDATE branch (~lines 1230-1249)**: same gating. For Davis, if the incoming payload has a real date, fall through into the existing scheduled reschedule logic (debounce, reschedule history, IPC reset, etc.) instead of the "force back to unscheduled" block. If it has no date, keep today's Davis behavior (refresh `time_preference` only, don't wipe an existing booked date).

Leave Premier, ECCO, Horizon untouched.

### 2. `supabase/functions/all-appointments-api/index.ts` (line 184)

Remove `'davis vein & vascular'` from `UNSCHEDULED_PROJECTS`. This function is used by the direct REST intake endpoint, which now always receives Davis with a real date/time. Payloads with a date will insert as scheduled; if a legacy caller ever sends one without a date, it will still land in Needs Review via the standard null-date routing rule.

### 3. `src/components/appointments/AppointmentCard.tsx` (line 1591)

Change the Time Preference row's condition from a project-name whitelist to a per-row check: render the dropdown when the project is one of the unscheduled-capture projects (Premier / ECCO / Horizon / Davis) **and** `appointment.date_of_appointment` is falsy. Once a Davis row has a booked date, the dropdown disappears and the existing date/time editor takes over. Any other card (`DetailedAppointmentView.tsx`) that gates on the same project list gets the same `&& !date_of_appointment` guard.

## Data fix for Sarella Kately and any similar Davis rows

For Davis rows currently stuck as `is_unscheduled=true` with `date_of_appointment IS NULL`, we fetch the real appointment from GHL and repair the row:

1. Query all Davis rows with `is_unscheduled = true AND date_of_appointment IS NULL AND ghl_id IS NOT NULL`.
2. For each, call the existing GHL appointments API (same helper used by other syncs — `fetchGHLAppointmentsForContact` in `_shared/ghl-client.ts`, or the pattern used by `sync-buffalo-appointment-statuses`) using Davis's project GHL API key.
3. If an active appointment is returned, set `date_of_appointment`, `requested_time`, `ghl_appointment_id`, `calendar_name` (if missing), `is_unscheduled = false`. Leave `time_preference` in place so we don't lose historical context; the UI will hide it once `date_of_appointment` is set.
4. If GHL returns nothing, leave the row as-is (still legacy unscheduled).

Run this as a one-off SQL/edge-function invocation, not an ongoing job. Sarella Kately (`2e4d14c1…`, ghl_id `MViXAALeYGfzvNT9gal2`) is the primary target and matches the linked GHL contact.

## Memory updates

- Update `mem://projects/davis-vein-vascular/unscheduled-capture` to describe the new hybrid rule: Davis accepts scheduled appointments; Time Preference only applies to rows without a `date_of_appointment`.
- Update the Core "Unscheduled Capture" phrasing in `mem://index.md` so Davis is listed as hybrid rather than strict unscheduled.

## Out of scope

- Premier Vascular, ECCO Medical, Horizon Vascular Specialists behavior — unchanged.
- Approved-tag list in `retry-missing-ghl-approved-tags` — unchanged.
- No schema changes.
