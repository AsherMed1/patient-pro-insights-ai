## Problem

Gerald Ellison (Premier Vascular) shows `Dec 30, 2025 1:00 PM` in the portal even though Premier is an unscheduled-capture project that should only carry a `time_preference`. His row already has `time_preference='afternoon'`, but `date_of_appointment`, `requested_time`, and `is_unscheduled=false` got written on top.

## Root cause

`supabase/functions/ghl-webhook-handler/index.ts` enforces the unscheduled rule (no booked date/time, `is_unscheduled=true`) only on **insert** (lines 731‑759). The **update** path (lines 776‑833) accepts whatever `date_of_appointment` / `requested_time` GHL sends. So when GHL later booked Gerald into a real calendar slot, the webhook overwrote his unscheduled state.

## Changes

### 1. Data fix — Gerald Ellison only

Migration on the single row `60da9f6d-ab63-47fe-b7c0-af8c18fe1d1d`:

- `date_of_appointment` → `NULL`
- `requested_time` → `NULL`
- `ghl_appointment_id` → `NULL`
- `is_unscheduled` → `true`
- keep `time_preference='afternoon'`, `status='Confirmed'`

### 2. Future-proof the webhook UPDATE path

`supabase/functions/ghl-webhook-handler/index.ts` — in `getUpdateableFields`, before the date/time merge block (around line 776):

- Compute `isUnscheduledProject` from `webhookData.project_name` using the existing `UNSCHEDULED_PROJECTS` set.
- If true:
  - Force `updateFields.date_of_appointment = null`, `updateFields.requested_time = null`, `updateFields.ghl_appointment_id = null`, `updateFields.is_unscheduled = true`.
  - Skip the entire reschedule-detection / `reschedule_history` branch (lines 778‑832) — there is no booking to reschedule.
  - Re-extract `time_preference` from incoming `patient_intake_notes` via the existing `extractTimePreference` helper; only overwrite when extraction returns a real value (don't clobber an existing preference with null).

This leaves the insert path and all other projects untouched, and matches the existing memory rules for Premier / ECCO / Davis unscheduled capture.

### 3. Out of scope

- Not touching the other ~1,186 historical Premier/ECCO/Davis rows that currently carry a booked date. Per your choice, only Gerald gets cleaned up.
- No UI changes — the portal already renders `Time Preference: Afternoon` from `time_preference`; clearing the date will simply hide the "Appointment: …" line.
