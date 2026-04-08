

## Re-parse Historical HAE Appointments Across All Clinics

### Current State
The HAE code fix is **already deployed and working**. New HAE appointments (after April 7) are being parsed correctly — Christopher Roff, Victor Donoso, Edwin Vela, Mira Jan Darwish, etc. all show proper HAE data.

However, **54 older HAE appointments** were parsed before the fix and are missing hemorrhoid-related medical information:

| Clinic | Total HAE | Missing Data | Action Needed |
|--------|-----------|-------------|---------------|
| Joint & Vascular Institute | 133 | 53 | Re-parse |
| Champion Heart and Vascular Center | 9 | 1 | Re-parse |
| The Painless Center | 10 | 0 | Already good |
| Vascular and Embolization Specialists | 9 | 0 | Already good |
| Ventra Medical Advanced Interventions | 2 | 0 | Already good |

### Fix — Bulk Re-parse (No Code Changes Needed)

Reset `parsing_completed_at` to `NULL` for the 54 HAE appointments that have missing pathology data. The auto-parse system will automatically pick them up and re-process them using the already-deployed HAE-aware logic.

**Single database update:**
```sql
UPDATE all_appointments
SET parsing_completed_at = NULL
WHERE (LOWER(calendar_name) LIKE '%hae%' OR LOWER(calendar_name) LIKE '%hemorrhoid%')
  AND lead_name NOT LIKE 'Reserved%'
  AND (parsed_pathology_info->>'primary_complaint' IS NULL 
       OR parsed_pathology_info->>'primary_complaint' = '')
```

This will trigger the auto-parser to re-fetch GHL contact data and extract HAE-specific fields (hemorrhoid diagnosis, rectal bleeding, colonoscopy, PCP info, etc.) for all 54 records.

### Summary
- No code changes — the HAE fix is already live
- One database update to reset 54 stale records for re-parsing
- The auto-parser will process them automatically in batches

