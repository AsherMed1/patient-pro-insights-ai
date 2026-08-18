# Catherine Rivera — missing DOB in Buffalo Vascular Care

## Why it happened (confirmed from her record)

Her appointment (`db3b3bfd`, Buffalo Vascular Care, GAE Depew NY) has a blank DOB, blank age, and blank DOB in both Demographics and Contact Info. The raw intake notes on the same record do contain a DOB:

```text
Date of Birth: 2019-03-26
```

That is a birth year of 2019 — age 7. The portal has a plausibility guard that rejects any DOB younger than 13 years old (it was added so stray appointment dates and "2026" dates never land in Demographics as a birth date). The guard exists in both the GHL webhook handler and the intake parser, and in both places a rejected value is **silently discarded** — no DOB is stored and no warning is surfaced.

So the value arrived from GHL, was correctly identified as not a real DOB, and then vanished with no trace in the UI. Her own intake answers say she is "36 to 45", which confirms the GHL contact record itself holds a wrong date of birth.

Four other live records currently have the same signature (a DOB in the notes that the guard rejected): Bonnie Larsen (NG Vascular, `2026-01-13`), Kerry Bobineaux (Seamless, `2026-07-24`), plus two Emage test records.

## Fix

1. **Stop silent drops.** When the webhook or the parser rejects a DOB as implausible, record the rejected raw value and the reason on the appointment instead of discarding it.
2. **Surface it in the portal.** On the appointment card / detailed view, where DOB is blank but a rejected value exists, show a "DOB needs verification" warning with the value received from GHL (e.g. "GHL sent 2019-03-26 — not a valid date of birth") and the existing inline DOB edit so a setter can correct it in one click. Correcting it sets the human-verified lock and rewrites the DOB line in the raw notes, as it does today.
3. **Review Queue signal.** Extend the existing "Invalid DOB" badge so it also fires on rejected/implausible DOBs (not just future years), so these are caught before approval.
4. **Backfill the current cases.** Flag the five live records above so they show the warning immediately. Catherine's true DOB is not known to the system — it must be corrected in GHL or typed in the portal; the plan does not invent a value.

## Technical notes

- Guard lives in `normalizeDob` in `supabase/functions/ghl-webhook-handler/index.ts` and in `auto-parse-intake-notes/index.ts` (`MIN_PLAUSIBLE_DOB_AGE_YEARS`, currently 13). Behaviour of the guard itself does not change — only what happens to the rejected value.
- Add a nullable `dob_rejected_value` (text) and `dob_rejected_at` (timestamptz) column on `all_appointments`, written by both functions when the guard fires and cleared on a successful/verified DOB save.
- UI touch points: `src/components/appointments/AppointmentCard.tsx`, `DetailedAppointmentView.tsx`, `src/components/admin/ReviewQueue.tsx`, reusing `isImpossibleDobValue` from `src/lib/dobNotes.ts`.
- Backfill is a data update over the five identified rows, no destructive changes.
