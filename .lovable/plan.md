## Fix insurance parsing for Ally Vascular (Travis Long et al.)

### Bugs
1. **Plan = Provider:** Regex fallback in `auto-parse-intake-notes/index.ts` (lines 344–366) sets `insurance_plan = insurance_provider` when it sees "Insurance Provider:". Travis's real plan ("MEDICARE SUPPLEMENT PLAN G") is overwritten by "PHYSICIAN MUTUAL".
2. **Garbage group number:** AI/regex is dumping conversational summaries (`missing Insurance Type: unknown Appointment Status: scheduled Appointment Details: May 2nd at 2 PM`) into `insurance_group_number`. Affects 9+ Ally patients.

### Changes

**1. `supabase/functions/auto-parse-intake-notes/index.ts`**
- Stop assigning `insurance_plan = provider` in regex fallback.
- Add explicit `Insurance Plan:` regex extractor.
- Add `isInvalidGroupNumber()` sanitizer (rejects values with `Insurance Type:`, `Appointment Status:`, `Appointment Details:`, `scheduled`, `unknown`, `missing`-prefix, or >40 chars). Apply after regex, GHL field extraction, and AI output.
- Tighten AI system prompt for `insurance_group_number`: "Only the alphanumeric group/plan number from the insurance card. Never copy conversation summaries, statuses, dates."
- Tighten AI prompt for `insurance_plan`: "Plan name from card or GHL Insurance Plan field. Never copy provider name."

**2. Backfill bad data**
```sql
UPDATE all_appointments
SET group_number = NULL,
    parsed_insurance_info = parsed_insurance_info - 'insurance_group_number',
    parsing_completed_at = NULL,
    updated_at = now()
WHERE parsed_insurance_info->>'insurance_group_number' ~* 
  '(insurance type:|appointment status:|appointment details:|scheduled)';
```
Then trigger `auto-parse-intake-notes` to re-process the queue with corrected logic.

**3. Verify**
After re-parse, Travis Long should show: Provider=PHYSICIAN MUTUAL, Plan=MEDICARE SUPPLEMENT PLAN G, Member ID=8750012453, Group#=blank.
