# Trainee Review: late-appearing tab + booking still landing in New

## What I verified

- The test record exists: `Test Trainee Johann Do Not Touch` (created 18:15 UTC today, project `Ally Vascular  and Pain Centers`, contact `HKOXngornC476TLZtzeC`) with `insurance_intake_source = NULL` and `review_stage = 'new'`. So the webhook still never resolved a value.
- The Ally project row does have GHL credentials (`ghl_location_id = vRT9AlSvuJsupOjfJekW`, API key present), so the credential-lookup fix from last round should now find the project.
- Edge function logs for `ghl-webhook-handler` are not retained for that request, so I cannot yet tell whether the contact fetch ran and returned nothing, failed with an auth/404 error, or the field simply wasn't on the contact at booking time. The cause is unconfirmed — step 1 below is to confirm it, not to guess.
- The tab flicker is confirmed in code: `ReviewQueue.tsx` renders the Trainee Review button only when `canReviewTrainees` (`hasRole(['admin','agent','trainer'])`) is true, and `useRole` starts with `loading = true`. So the button is genuinely absent for the first render(s) until roles resolve — that's why it "showed up after a few more seconds".

## Fix 1 — Trainee Review tab no longer pops in late

In `src/components/admin/ReviewQueue.tsx`: while `useRole().loading` is true, render the bucket row in a stable state instead of omitting the button — show the Trainee Review button in a disabled/skeleton state and only hide it once roles have loaded and the user genuinely lacks access. No layout jump, no missing tab.

## Fix 2 — Find out exactly why the intake source is lost

Add a small admin-only diagnostic edge function `debug-intake-source` that takes a contact id (or appointment id) and returns, without exposing the API key:
- which project row was matched and by which strategy (location id / exact name / normalized name),
- HTTP status of the custom-field definitions call and the contact call,
- the list of custom field keys found on the contact (names only) and the raw value of any key matching `insurance intake source`,
- the normalized result (`trainee_submitted` / etc.).

Run it against `HKOXngornC476TLZtzeC`. That output names the real failure: bad token, v2 endpoint rejecting the key, field stored under a different key, or the field genuinely empty on the contact at booking time.

## Fix 3 — Make the webhook path observable and self-healing

In `supabase/functions/ghl-webhook-handler/index.ts`:
- Upgrade the intake-source logging so every attempt records project match strategy, HTTP statuses, and the matched field key — using the same helper as the diagnostic, so future tests are diagnosable from logs alone.
- Persist the outcome on the row: write the resolved source (or an explicit "not found") so the Review Queue can show why a record was routed the way it was, instead of a silent NULL.

Then apply the actual correction that step 2 identifies (for example: switch the contact lookup to the working API version, or match the field by its GHL field id when the key name differs).

## Fix 4 — Re-test

Re-fire a booking with **Insurance Intake Source = Trainee Submitted** and confirm the row is created with `insurance_intake_source = 'trainee_submitted'` and `review_stage = 'trainee'`, landing in Trainee Review. If the diagnostic shows GHL simply doesn't carry the field on the appointment webhook nor on the contact at booking time, that's a GHL-side workflow ordering issue and I'll write up exactly what Mohsin needs to change.

## Technical notes

- `src/components/admin/ReviewQueue.tsx`: gate the trainee button on `!roleLoading` with a placeholder, don't unmount it.
- `supabase/functions/ghl-webhook-handler/index.ts`: extract the contact custom-field resolution into a shared, instrumented helper; keep existing create/update guards intact.
- New `supabase/functions/debug-intake-source/index.ts` (JWT-verified, admin-only, returns no secrets).
- No schema change required.
