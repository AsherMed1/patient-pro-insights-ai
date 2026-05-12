## Plan

1. **Clean the still-visible corrupted insurance field**
   - Add a database migration that clears only obviously corrupted `detected_insurance_provider` values containing leaked GHL summary text like `GAE Info`, `PFE Info`, `UFE Info`, `PAE Info`, or `No fields found in your shared list`.
   - Keep valid parsed insurance data intact (`insurance_plan`, `insurance_id_number`, notes, card links, etc.).
   - This directly fixes the screenshot case: Roshanda Spears has clean `parsed_insurance_info`, but stale corrupted `detected_insurance_provider` is still being used as the display fallback.

2. **Stop future stale fallback values from resurfacing**
   - Update `auto-parse-intake-notes` so appointment updates explicitly set top-level insurance columns from the cleaned parsed values, including setting `detected_insurance_provider` to `null` when no valid provider exists instead of leaving the old corrupted value in place.
   - Add an insurance-provider sanitizer similar to the existing group-number guard, rejecting values that contain procedure template text, appointment summaries, or long multi-label blobs.

3. **Use sanitized intake notes for AI parsing too**
   - The current `Patient Intake Summary` stripping is applied to fallback regex parsing and enrichment, but the AI prompt still receives the raw unstripped notes.
   - Change the AI prompt input to use the stripped notes so the AI cannot re-extract the single-line GHL summary blob into insurance/provider fields.

4. **Add a UI safety net for insurance display**
   - In `ParsedIntakeInfo`, filter provider/plan/member/group display values through a small “is corrupted blob” guard before rendering.
   - This prevents existing bad top-level values from appearing even if a future record slips through before cleanup.

5. **Validate with the affected patient**
   - Query Roshanda Spears and the affected-count query again to confirm the corrupted provider text is gone.
   - Check the portal display path so the Insurance section falls back to clean values only, showing plan/member ID and hiding provider when no real carrier was supplied.