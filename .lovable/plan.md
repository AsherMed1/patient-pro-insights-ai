## Problem

Dismiss fails with:
`new row for relation "all_appointments" violates check constraint "all_appointments_review_status_check"`

The DB check constraint on `all_appointments.review_status` only allows:
`'pending', 'approved', 'declined', 'oon'`

But the app (and the core memory rule) treats `'dismissed'` as a valid value — `ReviewQueue.tsx` writes `review_status: 'dismissed'` in two places (line 426 duplicate-dismiss flow, line 827 plain Dismiss button), and the Declined-tab query at line 348 also filters by it. So every Dismiss click is rejected by Postgres.

## Fix

Single migration to widen the check constraint:

```sql
ALTER TABLE public.all_appointments
  DROP CONSTRAINT all_appointments_review_status_check;

ALTER TABLE public.all_appointments
  ADD CONSTRAINT all_appointments_review_status_check
  CHECK (review_status = ANY (ARRAY['pending','approved','declined','oon','dismissed']));
```

That's it — no code changes. The frontend already uses `'dismissed'` correctly; only the DB constraint is out of sync.

## Safety

- Pure constraint widen — no row rewrites, no data loss, instantly reversible by re-adding the narrower check (no current rows use `'dismissed'` yet, since every attempt has been rejected).
- No effect on existing pending/approved/declined/oon rows.
- No RLS, grants, triggers, or edge functions touched.
- Aligns DB with the documented Core rule ("Dismissed rows (`review_status='dismissed'`) are permanently hidden from both queue views").

## After migration

You retry Dismiss on Mohsin L — the row should disappear from the Declined tab and stay hidden permanently.
