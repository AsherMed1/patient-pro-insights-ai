# Bella Kumar disappeared from the Champion Heart portal

## What I found

She is in the database — three rows, none of them visible to the clinic.

```text
17 Aug  row A (event ntkxKSA9…)  Aug 28, 9:00 AM  Welcome Call, approved
27 Aug 19:13  GHL sends a NEW booking (event 8Isax7UYyRksNgSXljP8), same
              Aug 28 9:00 slot -> row B created; row A auto-superseded
              ("Superseded by newer GHL booking …")
27 Aug 20:02  GHL sends "Cancelled" for row B -> status Cancelled and
              review_status = declined ("Auto-declined — appointment was
              cancelled in GoHighLevel")
```

Result: row A is superseded (hidden), row B is declined + cancelled (hidden). The contact has zero visible rows, so the clinic sees nothing — including the Welcome Call state and notes they logged this morning. The notes were carried forward onto row B, which is why they still exist but are unreachable.

This follows the earlier fix where the old GHL event was dead ("invalid event id"); the clinic re-booked in GHL, which produced the new event, and something then cancelled that new event 45 minutes later.

Two things need to happen: put Bella back in the portal, and stop the "supersede + auto-decline" pair from ever emptying a contact out of the portal.

## Fix

### 1. Restore Bella now
- Confirm in GoHighLevel whether event `8Isax7UYyRksNgSXljP8` really is cancelled or whether the cancel came from the all-day reserved block on Aug 28.
  - If it is a genuine cancellation: leave row B cancelled, but un-supersede row A is wrong too — instead keep one visible row reflecting reality and tell the clinic the appointment is cancelled in GHL.
  - If it is not a genuine cancellation (most likely, given the clinic just re-booked and logged a Welcome Call): restore row B to `Confirmed` / `review_status = approved`, carry the Welcome Call state and attempt history from row A onto it, and add an internal note explaining the correction.
- Either way, exactly one non-superseded, non-declined row for this contact ends up visible in the Champion Heart portal.

### 2. Guard: never leave a contact with no visible row
In `ghl-webhook-handler`, when a cancellation auto-declines a row, check whether the contact still has any visible row in that project. If the auto-decline would leave none, and the row it superseded minutes earlier was an approved/active booking, un-supersede that prior row instead of leaving the patient invisible, and write an internal note describing the restore.

Also tighten the supersede step: a row that is being superseded by a brand-new booking for the *same date and time* is a re-book of the same slot — its portal-owned state (Welcome Call state, welcome-call attempts, procedure status) should be copied onto the new row rather than left behind on the hidden one.

### 3. Visibility safety net
Add a lightweight admin check (existing Review Queue "Declined" tab already lists these) — the Declined tab entry for Bella should be restorable in one click, which it is; no new UI needed. The real fix is the guard above.

## Technical detail

- `supabase/functions/ghl-webhook-handler/index.ts`
  - `supersedeOlderContactRows`: when the new booking matches the superseded row's `date_of_appointment` + `requested_time`, copy `welcome_call_state`, `welcome_call_attempt_count`, `welcome_call_*_at`, and `procedure_status` onto the new row; re-point `appointment_contact_attempts` rows with `source = 'welcome_call'` to the new appointment id.
  - Auto-decline path: after setting `review_status = 'declined'`, count non-superseded, non-declined/dismissed rows for `(ghl_id, project_name)`. If zero and a sibling was superseded by this same event within the last hour, clear `is_superseded` on that sibling and note the restore.
- Data repair for Bella runs as a one-off SQL update on `all_appointments` plus an `appointment_notes` entry; no schema change.
