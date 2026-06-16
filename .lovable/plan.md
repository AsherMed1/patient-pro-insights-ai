## Issue

Patient **Ruben De La Fuentes** (GHL contact `OMwQgMyoydxHXzkkDX4u`, Ally Vascular and Pain Centers) has a **new Neuropathy Consultation** booked in GHL but it never landed in our portal.

## Root-cause confirmed via GHL API

GHL returns one active appointment for this contact that we do not have:

- GHL appointment ID: `9mE4qNGZIQVjBKLouue9`
- Title: *Ruben De La Fuentes Neuropathy Consultation*
- Start: `2026-06-20 07:00` (end `07:15`)
- Calendar: `6LC4cgaNF54rZ2wPIvQm`
- Status: `new`
- Created in GHL: `2026-06-15 16:26:58`

Our DB only has his older `2026-03-28` OON record (`cb1234f0…`) and an unrelated `Ruben Martinez Martinez` row. No row exists for `ghl_appointment_id = 9mE4qNGZIQVjBKLouue9`, and `ghl-webhook-handler` logs have no trace of that ID, contact ID, phone, or "delafuent". The GHL booking webhook simply never reached us (or fired before log retention) — so the appointment is missing, not suppressed by review/superseded logic.

## Plan

1. **Backfill the missing appointment** via `supabase--insert` into `all_appointments` with:
   - `project_name`: `Ally Vascular  and Pain Centers`
   - `ghl_appointment_id`: `9mE4qNGZIQVjBKLouue9`
   - `ghl_id`: `OMwQgMyoydxHXzkkDX4u` (GHL contact ID — matches how new records key the contact)
   - `ghl_location_id`: `vRT9AlSvuJsupOjfJekW`
   - `lead_name`: `Ruben De La Fuentes`
   - `lead_phone_number`: `+17262318752`
   - `lead_email`: `delafuentesruben@gmail.com`
   - `date_of_appointment`: `2026-06-20`
   - `requested_time`: `07:00:00`
   - `calendar_name`: matching the GHL calendar (`Request Your Neuropathy Consultation at  Amber Street, San Antonio, TX`, same as his prior row, since calendar `6LC4cgaNF54rZ2wPIvQm` is the Amber Street neuropathy calendar)
   - `status`: `Confirmed`
   - `review_status`: `pending` (Ally is not exempt, so it must hit the Review Queue → routes to **New / Needs Review**)
   - `internal_process_complete`: `false`
   - `is_superseded`: `false`
   - `date_appointment_created`: `2026-06-15 16:26:58+00`

2. **Verify** the row appears in the Ally portal's New / Needs Review tab and Review Queue.

3. **Out of scope** (flag only, no fix): investigate why the GHL booking webhook was not delivered for this contact. If this is a recurring pattern across Ally we can add a scheduled reconciliation job, but that is a separate task.

## Notes

- No code or migration changes — this is a single targeted data backfill.
- Will not modify or supersede the existing `cb1234f0…` OON record.
- Lead name will be stored as `Ruben De La Fuentes` (matches GHL), resolving the earlier "name search misses him" complaint going forward.
