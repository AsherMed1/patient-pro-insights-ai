# Fix "Confirm OON" failing with an ambiguous column error

## What is happening

Confirming OON updates the appointment's status, which fires the database trigger `qa_ingest_terminal_status`. Inside that trigger there is a local variable named `alert_type`, and it is used in a lookup against the `qa_cases` table, which also has a column named `alert_type`:

```text
WHERE appointment_id = NEW.id
  AND alert_type = 'potential_oon'   <-- Postgres cannot tell variable from column
```

Postgres refuses the statement with `column reference "alert_type" is ambiguous (42702)`. Because the trigger errors, the whole status update is rolled back — so the record keeps its old status, never lands in the Review Queue OON bucket, and none of the OON side effects (GHL `oon pt` tag / OON workflow, Slack alert) run.

This branch only executes for OON, which is why Approve and Decline still work.

## Fix

Rename the trigger's local variable so it can never collide with the column (e.g. `v_alert_type`), and qualify the column reference in the `qa_cases` lookup. No behavior change beyond removing the error.

## Verification and cleanup

- Re-run the OON confirmation on the affected ECCO Medical record (Jennifer Murphy) and on the linked contact from the GHL link provided, and confirm: status becomes OON, the row appears in the Review Queue OON bucket, the `oon pt` / `appointment-oon` tags land on the GHL contact, and the Slack OON alert fires.
- Check whether any records were left half-updated by the failed attempts (flag resolved but status not OON) and re-drive them through the normal OON path so the GHL workflow fires.

## Technical details

- Single migration replacing `public.qa_ingest_terminal_status()`: `alert_type` → `v_alert_type` throughout, and the `qa_cases` lookup uses `qa_cases.alert_type = 'potential_oon'`.
- No frontend changes; `ReviewQueue.tsx` and `evaluate-potential-oon` stay as-is.
