## Confirmed from the data

The GHL payload already carries both pieces in the intake notes blob:

```
Additional Information:
  Location Picker: Lone Tree
Contact Information:
  Service Name: GAE
```

Nothing in our parser, webhook, or UI reads `Location Picker` — that's why ECCO rows show "Unknown" location and reports under-count GAE/PFE.

## Fix plan

### 1. Parser — `supabase/functions/auto-parse-intake-notes/index.ts`
Add two regex extractions before AI parsing:
- `Location Picker:\s*(.+)` → write to `parsed_pathology_info.location` (Lone Tree / Pueblo / Virtual / Denver).
- `Service Name:\s*(GAE|PFE|UFE|PAE|HAE|PAD|FSE|TAE)` → set `parsed_pathology_info.procedure_type` as a high-priority override before calendar-name keywords.
- Add a PFE keyword fallback (plantar / heel / foot) for cases like Tonja Spencer where neither field is present.

### 2. Webhook — `supabase/functions/ghl-webhook-handler/index.ts`
- Persist `Location Picker` and `Service Name` to the row at webhook time so location/procedure are correct even before AI parsing runs.
- Dedupe: when a row already exists for a `ghl_id` and the incoming `calendar_name` is non-Unknown, update the existing row instead of inserting a duplicate (kills the Unknown twin that fires ~2s after every ECCO unscheduled lead).

### 3. UI — `AppointmentCard.tsx` + `LocationLegend.tsx`
- Extend the procedure-badge fallback chain at the top of the card: `parsed_pathology_info.procedure_type` → Service Name regex from notes → calendar-name keyword → plantar/knee keyword scan.
- In `extractLocationFromCalendarName`, add a fallback that reads `parsed_pathology_info.location` (Location Picker) when calendar name is "Unknown", so unscheduled rows appear under the correct location filter and the May report reconciles.

### 4. One-off backfill (SQL migration)
- For all ECCO rows where `calendar_name = 'Unknown'`: regex-extract `Location Picker:` and `Service Name:` from `patient_intake_notes`, write to `parsed_pathology_info.location` / `procedure_type`.
- Merge orphan Unknown twins into their real sibling by `ghl_id` (delete the Unknown twin, keep the one with the real calendar name).
- Re-queue the ~6–7 ECCO rows still showing `procedure_type: null` through `reparse-specific-appointments`.

### Outcome for the May report
- Every ECCO row gets a real location (Lone Tree / Pueblo / etc.) — no more "Unknown".
- Every row gets a GAE / PFE service tag.
- Total May count = GAE + PFE counts (no leakage from untagged rows).

## Files touched
- `supabase/functions/auto-parse-intake-notes/index.ts`
- `supabase/functions/ghl-webhook-handler/index.ts`
- `src/components/appointments/AppointmentCard.tsx`
- `src/components/appointments/LocationLegend.tsx`
- new migration: backfill + dedupe

No schema changes.

Approve and I'll implement.