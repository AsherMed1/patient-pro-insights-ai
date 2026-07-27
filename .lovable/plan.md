## Goal

Bring No-Show and Cancellation events into the QA Operations Queue as real alerts, hidden by default, visible only to admins and Kathryn Meksavanh, and visually distinct from the existing alert types.

## Behavior

- Every transition of an appointment to Cancelled or No Show creates a QA case (no "was previously confirmed" requirement).
- New alert types: `no_show` and `cancellation`.
- Default view for all users stays exactly as today: Confirmed Appointments, Short-Notice, Out-of-Network (and the existing Review Queue pairing logic). No visual or behavioral change to those.
- Admins and Kathryn Meksavanh get an extra "Show No-Show / Cancellations" toggle plus two new options in the Alert Type filter. Everyone else never sees these rows, in any bucket, count, or search result.
- The two new alert badges use their own distinct color treatment (amber for No-Show, rose/red-muted for Cancellation) so they stand out from the current badges.

## Technical details

Database (migration):
1. Extend the `qa_cases.alert_type` allowed values to include `no_show` and `cancellation`.
2. Update `qa_ingest_terminal_status()` so that a status change into Cancelled/Canceled or No Show calls `qa_upsert_case(...)` with alert type `cancellation` / `no_show`, in addition to the existing `qa_metrics_events` insert (metrics logging stays untouched, still gated on `was_ever_confirmed`).
3. Keep the existing exception-swallowing wrapper so ingestion failures can never block the parent status update.
4. No backfill of historical cancellations — alerts start flowing from the migration forward.

Frontend (`src/components/admin/QAOperationsQueue.tsx`):
1. Add `no_show` and `cancellation` to the `AlertType` union and `ALERT_LABELS`; give them dedicated badge classes via `alertVariant`/className rather than reusing existing variants.
2. Introduce a `canSeeTerminalAlerts` check: user is admin (existing `useRole`) OR the signed-in email is `kathryn.m@patientpromarketing.com`.
3. Query alert types become dynamic: base `ACTIVE_ALERT_TYPES` for everyone, plus the two terminal types only when `canSeeTerminalAlerts` and the toggle is on. This applies to all three fetch queries so bucket counts stay consistent.
4. Grouping logic: a no-show/cancellation alert on the same patient must not hijack the primary alert shown to users who can't see it — filter the sibling list by visible types before choosing the primary.
5. Add the toggle and the two extra Alert Type filter entries, rendered only for permitted users.

## Not changing

Existing Confirmed / Short-Notice / OON design, ingestion, pairing rules, and Review Queue behavior all stay as-is.
