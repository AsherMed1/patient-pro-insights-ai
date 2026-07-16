## Backfill VSAV: Shrader Road → Mechanicsville

GHL is already renamed, so future bookings will land as "…at Mechanicsville" automatically. The one existing VSAV row in `all_appointments` still says "Shrader Road", which is why the dropdown still shows it.

### Change
Single data update — no schema, no code:

```sql
UPDATE all_appointments
SET calendar_name = REPLACE(calendar_name, 'Shrader Road', 'Mechanicsville')
WHERE project_name = 'Vascular Surgery Associates of Virginia'
  AND calendar_name ILIKE '%Shrader Road%';
```

Affects 1 row. After it runs, the **All Locations** dropdown will show Henrico, Petersburg, Mechanicsville on next load.
