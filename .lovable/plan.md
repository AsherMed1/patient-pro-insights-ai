# Insurance Card Upload Fixes

Two distinct bugs on the appointment Insurance section:

## Problem 1 — Primary card uploads overwrite each other

`InsuranceCardUpload.tsx` has a stale-closure race. `handleFrontUpload` calls `saveUrls(url, backUrl)` and `handleBackUpload` calls `saveUrls(frontUrl, url)`, where `frontUrl`/`backUrl` come from React state captured at render time. If a save finishes after the user uploads the other side (or if two uploads run in parallel), the older closure value (often `null`) wipes the freshly-saved URL on the other side. The last save wins → only one card image remains.

**Fix:** Use refs that always hold the latest URLs, so `saveUrls` always reads the current pair regardless of closure timing.

- Add `frontUrlRef` / `backUrlRef`, kept in sync via `useEffect` whenever `frontUrl` / `backUrl` change.
- Rewrite `saveUrls` to take a partial patch (`{ front?, back? }`) and merge against the refs before calling `update-appointment-fields`. Only the field(s) the caller intends to change get sent; the other side is read from the ref, not the closure.
- `handleRemoveFront/Back` use the same patch-based call.

No backend, schema, or storage-path changes needed for the primary side.

## Problem 2 — Secondary insurance has no upload UI

Secondary insurance data lives in `all_appointments.parsed_insurance` JSONB with only a single `secondary_card_url` field (front only). There is no upload control and no back-of-card field.

**Fix:** Add a Secondary upload section that mirrors the Primary one, persisting both front and back into `parsed_insurance`.

- Extend the JSON shape with `secondary_card_front_url` and `secondary_card_back_url`. Keep reading legacy `secondary_card_url` as a fallback for the front so existing records still render.
- In `ParsedIntakeInfo.tsx`, render a new `SecondaryInsuranceCardUpload` block (collapsible, same visual pattern as the primary `Upload Insurance Card`) inside the Secondary Insurance card. Show it whenever the section is visible — even if only one field is present today — so users can add cards to records that don't yet have them.
- Update the "View Secondary Insurance Card" button to prefer `secondary_card_front_url`, then fall back to `secondary_card_url`.

## Technical details

### Files to change
- `src/components/appointments/InsuranceCardUpload.tsx` — refs + patch-based `saveUrls`; fixes Primary overwrite.
- `src/components/appointments/SecondaryInsuranceCardUpload.tsx` *(new)* — copy of `InsuranceCardUpload` adapted to write to `parsed_insurance.secondary_card_front_url` / `secondary_card_back_url` via a new edge action.
- `src/components/appointments/ParsedIntakeInfo.tsx` — read `secondary_card_front_url ?? secondary_card_url` and `secondary_card_back_url`; render the new collapsible upload block; pass them through to the new component.
- `supabase/functions/update-appointment-fields/index.ts` — accept a `parsedInsurancePatch` (or equivalent) that merges into the existing `parsed_insurance` JSONB without clobbering other keys. Audit log entries keep current format.

### Storage paths
Secondary uploads use the existing `insurance-cards` bucket with path:
`${sanitizedProject}/${appointmentId}/secondary_${side}_${Date.now()}.${ext}`
No new bucket or policy needed.

### Verification
1. Open an appointment with both Primary and Secondary insurance.
2. Upload Primary Front → upload Primary Back → both thumbnails remain; refresh → both persist; "View Insurance Card" still opens the front.
3. Upload Secondary Front → upload Secondary Back → both thumbnails remain; refresh → both persist; "View Secondary Insurance Card" opens the front.
4. Remove either secondary side → the other survives.
5. Legacy record with only `secondary_card_url` still shows that image as the Front and lets the user add a Back.

## Out of scope
- Migrating existing `secondary_card_url` values into `secondary_card_front_url` (kept as a runtime fallback instead).
- Changing the Primary insurance schema/columns.
- Any GHL sync of the secondary card URLs (current behavior unchanged).
