# Fix: setters see no records in the Recapture Worklist

## What's actually wrong

Anyira's account is fine — she has the Setter role (`review_only`). The problem is the access rule on recapture records.

Verified in the database:

- Recapture records are restricted for setters to "only projects assigned to this user".
- Anyira has **zero** project assignments — and so does every other setter (all 25 setter accounts have none).
- The Review Queue has no such restriction: setters see every clinic there.

So the Recapture Worklist is empty for every setter today, not just Anyira, while the Review Queue works. There are ~1,500+ recapture cases in the system that admins can see.

## Fix

Align Recapture with the Review Queue: setters can read and work recapture cases across all clinics, matching the access they already have in the Review Queue and consistent with how the Setter role was described (Review Queue + Recapture).

1. Replace the project-scoped read/update rules on recapture cases and outreach attempts with role-based rules for `review_only` and `recapture`, same as the Review Queue's appointment rules.
2. Remove the now-unnecessary project filter the worklist applies in the UI for setters, so counts and buckets match what they are allowed to see.
3. Leave admin/agent/VA access unchanged.

## Technical notes

- Migration replaces `recapture_cases_setter_select` / `recapture_cases_setter_update` (and the matching `recapture_attempts` insert/select policies) with `has_role(auth.uid(),'review_only') OR has_role(auth.uid(),'recapture')`, dropping the `project_user_access` join.
- `src/components/recapture/RecaptureQueue.tsx` (~line 209) and `RecaptureReports.tsx`: drop the `accessibleProjects` narrowing for setters.
- No change to `useRole.tsx` role definitions.

## Alternative, if clinic scoping is intended

If setters are meant to be limited to specific clinics in Recapture, no code change is needed — instead each setter needs clinic assignments added in User Management, starting with Anyira. Say the word and this becomes the plan instead.

## Validation

- Sign in as Anyira, open Recapture: buckets show counts and rows across clinics; log an attempt and set a work status successfully.
- Confirm project-role users (clinic logins) still cannot reach Recapture.
