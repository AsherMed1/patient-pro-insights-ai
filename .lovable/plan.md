

## Fix: Refresh Button Should Fetch GHL Data and Reparse

### Root Cause
Two issues:
1. **CORS headers outdated** — Both `reparse-specific-appointments` and `fetch-ghl-contact-data` are missing required Supabase client headers (`x-supabase-client-platform`, etc.), causing "Failed to fetch" errors from the browser.
2. **No GHL data refresh** — The refresh button only calls `reparse-specific-appointments` (resets parsing and re-runs AI parser on existing notes). It never calls `fetch-ghl-contact-data` to pull fresh custom fields from GoHighLevel first.

### Fix

| File | Change |
|------|--------|
| `supabase/functions/reparse-specific-appointments/index.ts` | Update CORS headers to include all required Supabase client headers. Add logic to first call `fetch-ghl-contact-data` for each appointment (to pull fresh GHL data) before resetting parsing and invoking the auto-parser. |
| `supabase/functions/fetch-ghl-contact-data/index.ts` | Update CORS headers to match the required set. |
| `src/components/appointments/ParsedIntakeInfo.tsx` | Update `handleReparse` to show better status messages during the two-step process (GHL fetch + reparse). |

### Detail

**reparse-specific-appointments** — Enhanced flow:
```
1. For each appointment_id:
   a. Call fetch-ghl-contact-data internally (server-to-server, no CORS issue)
      → This pulls fresh custom fields from GHL and appends to patient_intake_notes
   b. Reset parsing_completed_at to null
2. Invoke auto-parse-intake-notes to re-parse all reset appointments
```

This makes the single refresh button do the full pipeline: GHL fetch → reset → reparse.

