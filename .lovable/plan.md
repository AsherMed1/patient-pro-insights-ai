## Premier Vascular: Lead Capture Without Appointment

### Goal
For Premier Vascular only, accept GHL/webhook lead data and store a **time-of-day preference** (Morning / Afternoon / Evening / No Preference) instead of creating a booked appointment with a date/time. All other projects continue to behave exactly as today.

### Scope Guarantee (no global impact)
Every change is gated by `project_name === 'Premier Vascular'` (with the existing project normalization). No shared code paths are altered for other clients — we add branches, not replace logic.

---

### Changes

**1. Database (additive, nullable)**
- Add `time_preference TEXT` to `all_appointments` (nullable). Allowed values via validation trigger: `morning`, `afternoon`, `evening`, `no_preference`, or NULL.
- Add `is_unscheduled BOOLEAN DEFAULT false` to flag Premier records captured without a booked slot.
- No changes to existing columns; existing rows unaffected.

**2. Intake API (`supabase/functions/all-appointments-api/index.ts`)**
- If incoming payload's `project_name` resolves to **Premier Vascular**:
  - Skip requiring `date_of_appointment` / `requested_time`.
  - Read `time_preference` from payload (accept `morning|afternoon|evening|no_preference`; normalize case; default `no_preference`).
  - Set `is_unscheduled = true`, `status = 'Pending'`, leave date/time NULL.
- All other projects: unchanged validation and behavior.

**3. GHL Webhook (`supabase/functions/ghl-webhook-handler/index.ts`)**
- Same Premier-only branch: detect time preference from GHL custom field (e.g. "Time Preference" / "Preferred Time"); if absent, default `no_preference`.
- Do not create GHL calendar event linkage; keep `ghl_appointment_id` NULL.
- Continue lead matching, demographics, intake parsing as normal.

**4. Routing & UI**
- Premier unscheduled records (NULL date) already route to **Needs Review** per existing rule — no change needed.
- In the appointment card (Premier only): replace the date/time row with a **"Time Preference"** badge (Morning / Afternoon / Evening / No Preference). Editable via dropdown.
- Excel export: add `Time Preference` column populated only for Premier rows.

**5. Memory**
- New memory `mem://projects/premier-vascular/unscheduled-capture`: documents that Premier captures leads without booking, stores `time_preference`, and is excluded from booking-flow logic (short-notice alerts, EMR queue auto-confirm, GHL availability checks).

---

### Technical Details

- **Short-notice alerts**: skipped automatically since `date_of_appointment` is NULL.
- **EMR auto-queue trigger**: only fires on `status='confirmed'`; Premier defaults to `Pending`, so no EMR rows created until a human confirms.
- **Reschedule / 2-phase booking flow**: untouched; only date-bearing rows enter that flow.
- **Status workflow trigger** (`handle_appointment_status_completion`): unchanged — still applies if a Premier record is later marked terminal.
- **GHL outbound sync**: Premier branch skips outbound calendar event creation/update; status sync continues.

### Out of Scope
- No changes to other clients' intake, booking, or UI.
- No removal of existing Premier appointments — only new captures use unscheduled flow.

Approve to implement.