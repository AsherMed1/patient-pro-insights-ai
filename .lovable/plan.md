Joseph Brant’s most recent `all_appointments` row (ID: `cfa151e7-a503-48ec-8663-121e56986884`, Liberty Joint & Vascular) is currently `status = 'OON'`. The user wants it reverted to `Confirmed` so they can manually attempt the OON transition again.

## Plan

1. **Update the appointment status** in `all_appointments`:
   - Set `status = 'Confirmed'`
   - Set `updated_at = now()`
   - Filter by `id = 'cfa151e7-a503-48ec-8663-121e56986884'` to target only the active row.

2. **Verify the change** with a follow-up `SELECT` to confirm the row now reads `Confirmed`.

## SQL to execute

```sql
UPDATE all_appointments
SET status = 'Confirmed',
    updated_at = now()
WHERE id = 'cfa151e7-a503-48ec-8663-121e56986884';
```

## Verification query

```sql
SELECT id, lead_name, project_name, status, updated_at
FROM all_appointments
WHERE id = 'cfa151e7-a503-48ec-8663-121e56986884';
```

No code changes are required for this request.