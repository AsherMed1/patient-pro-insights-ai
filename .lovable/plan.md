## Goal

Shift every upcoming Zenith Vascular & Fibroid Center appointment forward by 1 hour (CDT) in both HighLevel and the portal database. Example: Sandra Bray June 8, 10:00 AM → 11:00 AM.

## Scope

**Project:** Zenith Vascular & Fibroid Center (ghl_location_id `XHVCDbYGwWrszuBxiCNd`)

**Appointments affected:** 23 upcoming records with `date_of_appointment >= today`, excluding terminal statuses (Cancelled, No Show, Showed, Won, Do Not Call, Rescheduled, OON).

Breakdown:
- 14 Confirmed
- 9 Welcome Call
- (Yvonne Rayborn / OON on 6/11 will be skipped — terminal)

Date range: 2026-06-03 → 2026-06-22.

## Approach

There is already an edge function `fix-zenith-timezone-shift` from a previous shift, but it filters strictly to `status='Confirmed'`. I'll update it so it covers all upcoming non-terminal statuses, then re-run it.

### Steps

1. **Update `supabase/functions/fix-zenith-timezone-shift/index.ts`:**
   - Replace `.eq('status', 'Confirmed')` with `.not('status', 'in', '("Cancelled","No Show","Showed","Won","Do Not Call","Rescheduled","OON")')` so Welcome Call + Confirmed are both included.
   - Keep the +1h shift, `America/Chicago` timezone, GHL-first then DB update flow.
   - Keep the audit note format (logs old → new time as a System note).

2. **Dry run first:** `POST /fix-zenith-timezone-shift?dryRun=true` to preview the 23 shifts and verify no overflow into next day / no missing GHL IDs.

3. **Live run:** `POST /fix-zenith-timezone-shift` — function loops per appointment:
   - Calls `update-ghl-appointment` with `new_date`, `new_time`, `timezone=America/Chicago`.
   - On GHL success, updates `all_appointments.date_of_appointment` + `requested_time`.
   - Writes a System note to `appointment_notes` recording the shift.
   - 500ms pacing between requests.

4. **Verify:** Re-query the 23 IDs to confirm new times and spot-check Sandra Bray (should now read 11:00 in portal and GHL detail panel).

## Technical notes

- `ghl_appointment_id` is the correct column (verified populated for all 32 upcoming Zenith records).
- GHL sync webhook has a 120s echo-back debounce, so the inbound webhook fired by our outbound update will not revert our DB change.
- Reschedule status logic is intentionally NOT triggered — this is a bulk time correction, not a patient-initiated reschedule, so status stays as-is (matches prior Zenith shift behavior).
- Failed records are returned in the response payload so we can manually retry any GHL 4xx/5xx.

## Out of scope

- The OON appointment (Yvonne Rayborn 6/11) — terminal, intentionally skipped.
- Past appointments — not touched.
- No schema or RLS changes.
