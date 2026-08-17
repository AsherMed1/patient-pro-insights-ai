# GHL tag audit notes are showing as "Clinic visible"

## Answer first

Yes — a blue "System / Auto" note marked **Clinic visible** really is visible to clinic users. Note visibility is decided only by the `visibility` column, not by the author. Blue styling is cosmetic; it does not mean admin-only.

The two notes in the screenshot (the `"approved"` tag push audit lines) are meant to be internal, and the code that writes them already sets `visibility: 'internal'` in `update-ghl-contact-tags`. But the database shows 305 of these tag-audit notes stored as `clinic`, the newest written today at 13:10 UTC — so the version of that function actually running in production is still writing the old default. Every clinic user on those appointments can currently read them.

## Change

1. Redeploy `update-ghl-contact-tags` so the running function matches the repo (both the "tag added" and the "FAILED (401)" audit lines write `visibility: 'internal'`).
2. Confirm the fix by checking that new tag-audit notes land as `internal` after the redeploy.
3. Backfill the 305 existing `System` tag-audit notes (texts matching `tag added to the GHL contact`, `GHL tag push ... FAILED`, `Blocked "approved" GHL tag push`) from `clinic` to `internal`, so nothing historic stays exposed to clinics.
4. Leave genuinely clinic-relevant System notes untouched (status changes, cancellation reason, date/time re-sync, service change, short-notice applied).

## Technical notes

- No schema or RLS change; `appointment_notes.visibility` and its policies already exist.
- Backfill is a data-only update via the insert/query tool, scoped to `created_by = 'System'` and the three text patterns above.
- If the redeploy alone does not stop new `clinic` rows appearing, the next step is to trace the caller (`retry-missing-ghl-approved-tags` hourly sweep, Review Queue manual approve) and find the second writer before backfilling again.
