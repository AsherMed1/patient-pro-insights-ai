# Dejan Petkovski — portal says Scheduled, GHL says Cancelled

## What actually happened (confirmed from the record history)

| When (UTC) | Event |
|---|---|
| Aug 16, 12:16 | GHL reschedules the booking from Aug 19 9:30 AM to **Sep 24, 1:00 PM** (row `61714adc`) |
| Aug 16, 14:09 | GHL replays the old Aug 19 slot as a new event — the duplicate row `51e1e13a` |
| Aug 17, 11:41 | Mirella cancels the duplicate in the portal ("Other – Do Not Reschedule / DUPLICATE") |
| Aug 17, 11:41 | GHL echoes that cancellation onto the **live Sep 24 row**, which flips to Cancelled |
| Aug 17, 11:49 | Mirella sets the Sep 24 row back to **Scheduled** in the portal |
| Aug 21, 15:46 | Duplicate row retired as part of yesterday's dedupe fix |

The portal now shows Sep 24 as Scheduled. GHL still shows it Cancelled — because the Aug 17 restore never reached GHL.

## Root cause

The portal-to-GHL status bridge only knows six statuses: Confirmed, Cancelled, No Show, Showed, OON, Do Not Call. **"Scheduled" is not among them**, so when the status was set back to Scheduled the sync logged "no GHL mapping — skipping GHL sync" and did nothing. The cancellation had already been pushed to GHL; the un-cancel never was. Any status restore that lands on Scheduled has the same silent gap.

Also, the duplicate's cancellation applied `cancelled-portal`, `cancel-reason-other-do-not-reschedule` and `do-not-reschedule` tags to the shared GHL contact — those are still on Dejan and wrongly mark a live patient as do-not-reschedule.

## Fix

1. **Re-activate the Sep 24 booking in GHL.** Set that appointment back to confirmed in GHL so both systems agree, and write an internal note explaining the correction.
2. **Clear the stale contact tags.** Remove `cancelled-portal`, `cancel-reason-other-do-not-reschedule` and `do-not-reschedule` from Dejan's GHL contact, since the cancellation belonged to the retired duplicate.
3. **Map "Scheduled" (and the other revive statuses) to GHL confirmed**, so restoring an appointment in the portal always un-cancels it in GHL instead of silently skipping.
4. **Stop failing silently.** When a portal status has no GHL equivalent, write an internal note on the record saying the GHL sync was skipped, so a divergence like this is visible in the timeline instead of only in function logs.
5. **Divergence check.** Report portal rows that are active/non-terminal while GHL holds them cancelled, so any other contact stuck in this state from the Aug 17 echo surfaces now rather than when a clinic notices.

## Technical notes

- `supabase/functions/update-ghl-appointment/index.ts`, `STATUS_MAP`: add `Scheduled`, `Pending` and `Rescheduled` → `confirmed`; keep the unmapped branch for genuinely portal-only states (Referral Requested, Welcome Call) but have it record a note.
- Step 1 and 2 run through the existing `update-ghl-appointment` and `update-ghl-contact-tags` functions against contact `kWuGoUwtcVg8m6jd1vWt`, appointment `1UXzeoprJJ6agWBmYipt`.
- Step 5 is a read-only comparison of `all_appointments` against the GHL appointment status for contacts touched between Aug 16 and Aug 21; report first, correct after review.
- No schema change, no deletions.
