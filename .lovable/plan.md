## Problem

In the **Texas Endovascular – Houston Vein Clinic** portal, the Appointments list shows the right counts under **Service = All**, but **Service = PAE** returns 0 — same symptom you saw earlier for ECCO / Premier / Davis. Example: Edward Booker (PAE Woodlands, June 26, Confirmed, approved) is in the DB but missing from the PAE-filtered view.

## Root cause

TEH appointments have `parsed_pathology_info->>'procedure'` = NULL for nearly all rows:

| Project | Total | Procedure NULL |
|---|---|---|
| Texas Endovascular - Houston Vein Clinic | 579 | 579 |
| Texas Endovascular - Dallas Vein Clinic | 193 | 193 |
| Georgia Endovascular | 1,297 | 1,297 |

The Service filter ORs `calendar_name ILIKE %PAE%` with `parsed_pathology_info->>'procedure' = 'PAE'`. The calendar-name branch should match — but if any portal surface (stat card, dashboard, export, or a tab path) hits the procedure JSON branch alone, the row is invisible. This is the same class of bug we just fixed for ECCO / Premier / Davis, and TEH is not yet covered.

## Plan

### 1. Backfill `parsed_pathology_info.procedure` for TEH + Georgia Endovascular (existing rows)

Run a one-shot SQL update on `all_appointments` for these 3 projects only, using the same priority chain we used last time:

1. **Calendar name regex** (case-insensitive): `GAE|UFE|PAE|PFE|HAE|TAE|PAD|FSE`. Plus "in-person"/"knee" → GAE; "virtual" stays as-is for type inference but doesn't override an explicit token.
2. **Intake notes keywords** (case-insensitive fallback): `prostate|BPH` → PAE; `fibroid|uterine` → UFE; `knee pain|osteoarthritis|knee replacement` → GAE; `frozen shoulder` → FSE; `hemorrhoid` → HAE; `plantar fasciitis` → PFE; `peripheral artery` → PAD.
3. Leave NULL when no signal (rare — TEH calendar names are well-structured).

Updates `parsed_pathology_info` via `jsonb_set` and bumps `updated_at`. Only touches rows where `parsed_pathology_info->>'procedure' IS NULL`.

### 2. Extend new-row inference to TEH + Georgia Endovascular

Add these 3 projects to the `inferProcedureFromContext()` helper that already exists in:

- `supabase/functions/ghl-webhook-handler/index.ts`
- `supabase/functions/import-missing-leads-from-ghl/index.ts`

So future inserts pre-populate `parsed_pathology_info.procedure` immediately at insert time (no waiting on AI parse), which keeps the Service filter accurate from the moment the appointment lands.

### 3. Verify

After the backfill:

```sql
SELECT project_name, parsed_pathology_info->>'procedure' AS proc, COUNT(*)
FROM all_appointments
WHERE project_name LIKE 'Texas Endovascular%' OR project_name = 'Georgia Endovascular'
GROUP BY 1, 2 ORDER BY 1, 2;
```

Then re-open the TEH Houston portal → Service = PAE and confirm Edward Booker + the other ~131 approved PAE rows appear.

## Out of scope

- No changes to the Service filter UI / query logic — it already does the OR fallback correctly.
- No changes to review-queue exempt-project list (TEH still goes through normal review approval).
- Not touching projects beyond TEH Houston/Dallas + Georgia Endovascular in this pass; if you want me to also include other vascular projects with NULL procedure, say the word and I'll widen the backfill.
