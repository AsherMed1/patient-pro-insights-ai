## Add editable Secondary Insurance to the portal

**Problem:** The portal's Insurance card has an inline edit pencil for the primary insurance (Provider, Plan, Member ID, Group Number), but the Secondary Insurance card in `ParsedIntakeInfo.tsx` is read-only and only renders when secondary data already exists. There is no way for a clinic user to add or edit secondary insurance fields — only to upload a secondary card image.

## Changes (frontend only, `src/components/appointments/ParsedIntakeInfo.tsx`)

1. **Always render the Secondary Insurance card** when `appointmentId` is present, even if there is no existing secondary data. When empty and not editing, show a small "Add Secondary Insurance" button that flips it into edit mode.

2. **Add edit mode for Secondary Insurance**, mirroring the primary card:
   - New state: `isEditingSecondary`, `editSecProvider`, `editSecPlan`, `editSecMemberId`, `editSecGroupNumber`, `isSavingSecondary`.
   - Pencil button in the card header opens edit mode; Check/X buttons save/cancel (same styling as primary, using the emerald palette already used by the secondary card).
   - Inputs for Provider, Plan, Member ID, Group Number.

3. **Save handler** `handleSaveSecondaryInsurance` calls the existing `update-appointment-fields` edge function with a `parsedInsurancePatch` (same pattern already used by `SecondaryInsuranceCardUpload.tsx`), writing:
   - `secondary_provider`
   - `secondary_plan`
   - `secondary_id_number`
   - `secondary_group_number`
   
   Empty strings are sent as `null` so users can clear a field. On success, toast + `onUpdate?.()`.

4. **Preserve the existing "Upload Secondary Insurance Card" collapsible** and the "View Secondary Insurance Card" button — they stay unchanged and remain available inside the always-visible card.

## Out of scope
- No DB migration (secondary fields already live inside `parsed_insurance_info` JSONB).
- No changes to the AI parser, GHL webhook, or any business logic.
- No changes to the primary insurance edit flow.