
# Fix GAE service filter returning 0 for ECCO Medical and Premier Vascular

## Root cause (same as the Davis fix from June 5)

In the client portal, the service filter for "GAE" matches against:

```
calendar_name ILIKE '%GAE%'
  OR calendar_name ILIKE '%In-person%'
  OR parsed_pathology_info->>'procedure' = 'GAE'
```

For ECCO Medical and Premier Vascular **unscheduled-capture** leads:

- Many rows have `calendar_name = 'Unknown'` (or `'Call Back Request …'`), so the calendar match fails.
- Every unscheduled row has `parsed_pathology_info->>'procedure' = NULL`, so the JSON match fails.
- The appointment card still **displays** a "GAE" badge because `AppointmentCard.tsx` falls back to keyword-matching `patient_intake_notes` ("knee pain" / "osteoarthritis" → GAE) — but that fallback is UI-only and is not applied to the DB query.

Result: "All Services" shows the rows (with a GAE badge from intake-notes fallback); selecting GAE in the dropdown returns 0.

DB confirms current state (`review_status IN ('approved','oon')`, unscheduled, `IPC=false`):

| Project | Unscheduled new appts | calendar GAE | parsed procedure GAE |
|---|---|---|---|
| ECCO Medical | 7 | 0 (all "Unknown" / PFE) | 0 |
| Premier Vascular | 8 | 4 ("Request your GAE Consultation at Macon, GA") | 0 |

Plus 164 ECCO and 154 Premier older rows where the calendar doesn't contain a procedure token and `parsed_pathology_info->>procedure` is NULL.

## Fix

Mirror the Davis backfill, but procedure-aware (ECCO offers GAE/PAE/PFE; Premier is GAE-dominant but also runs UFE/HAE/etc., so we cannot blanket-set GAE).

### 1. One-time SQL backfill (migration)

For every ECCO Medical, Premier Vascular, and Premier Vascular Surgery row where `parsed_pathology_info->>'procedure'` is NULL, set it from the strongest available signal, in this priority order:

1. **`calendar_name` token** — first match of `\b(GAE|UFE|PAE|PFE|HAE|TAE|PAD|Neuropathy)\b` (case-insensitive). "In-Person" / "In-person" → GAE (per existing portal rule). "Knee" → GAE.
2. **`patient_intake_notes` keywords** (case-insensitive), first match wins:
   - `knee pain` / `osteoarthritis` / `knee replacement` → **GAE**
   - `fibroid` / `uterine` → **UFE**
   - `prostate` / `BPH` / `enlarged prostate` → **PAE**
   - `plantar fasciitis` → **PFE**
   - `hemorrhoid` → **HAE**
3. **Project default fallback** (only when both signals are silent):
   - Premier Vascular / Premier Vascular Surgery → **GAE** (Macon practice is GAE-dominant; matches the intake-notes UI default they're already seeing).
   - ECCO Medical → **leave NULL** (3-procedure shop — never guess; these will continue to show with the existing "Virtual (Unspecified)" / no-service behavior).

Implementation: a single `UPDATE all_appointments SET parsed_pathology_info = jsonb_set(COALESCE(parsed_pathology_info, '{}'::jsonb), '{procedure}', to_jsonb(<inferred>), true), updated_at = now() WHERE …` using a `CASE` expression. Skip rows where the inferred value would be NULL.

Verification after backfill: re-run the same `COUNT(*) FILTER (WHERE parsed_pathology_info->>'procedure' = 'GAE')` query and confirm the GAE filter now returns the expected ECCO/Premier rows in the portal.

### 2. Prevent recurrence on future unscheduled-capture imports

Update the lead-insert path used for ECCO / Premier / Davis unscheduled captures so that on insert it auto-populates `parsed_pathology_info.procedure` using the same priority chain (calendar token → intake keywords → project default). Edit the two functions that create these rows:

- `supabase/functions/import-missing-leads-from-ghl/index.ts`
- The unscheduled branch of `supabase/functions/ghl-webhook-handler/index.ts` (around the "Unscheduled-capture projects" block referenced in memory).

Both should call a small shared helper `inferProcedureFromContext({ projectName, calendarName, intakeNotes })` that returns the procedure string or `null`, and merge it into the `parsed_pathology_info` JSONB they already write.

### 3. No frontend changes

`AllAppointmentsManager.tsx`, `AppointmentFilters.tsx`, and `ProjectDetailedDashboard.tsx` already handle `parsed_pathology_info->>procedure = '<service>'` correctly. Once the data is backfilled, the GAE dropdown will return the right rows for ECCO and Premier without any UI edits.

## Technical notes

- The backfill is a migration (it's a data UPDATE, not just a read), so it'll go through the migration approval flow.
- Memory rule already states "UI edits must simultaneously update top-level columns AND JSONB `parsed_*` objects" — this backfill respects that by using `jsonb_set` with `true` for create-if-missing.
- No change to the `review_status`, `is_unscheduled`, or routing logic — only the `parsed_pathology_info.procedure` field is touched.
- Premier Vascular Surgery (2 rows, all calendar = GAE) is included for completeness but is already matched by the calendar-name path; the backfill will simply set the JSON value to GAE for consistency.

## Out of scope

- No change to the service dropdown options (KNOWN_PROJECT_SERVICES already lists GAE for ECCO).
- No change to the GHL outbound sync.
- No retroactive change to historical Davis rows (already fixed June 5).
