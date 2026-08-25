# Fix: only one insurance card image lands for the primary card (AVA lead)

## What the data shows

For the AVA lead (record `fc4d82b6`, GHL contact `hzMMT89v8wuOQKopw7lj`):

- `insurance_id_link` = one LeadConnector URL, `insurance_back_link` = empty.
- The **secondary** card captured both images correctly (`secondary_card_front_url` + `secondary_card_back_url` in `parsed_insurance_info`).
- The stored intake notes contain exactly one primary card line: `insurance_id_link: https://.../HuRdckqtGKfDqejxC61l` — the merge tag. No primary upload field with two files ever reached the portal.
- Webhook logs confirm the payload carried only one card-ish key (`insurance_id_link`), and its value even arrived as the string `"null"` on other clinics.

So the patient did upload two distinct primary images, but the portal only received one URL — the one the GHL merge tag exposed, which happens to be the back. The portal then labels that single image "Front of Card". The secondary path works because it reads the real upload field (which returns both files), not a merge tag.

The exact GHL field name behind the primary upload is not yet confirmed, so verifying it is step 1.

## Plan

1. **Confirm the source (first step, no code change).** Pull the raw GHL contact for `hzMMT89v8wuOQKopw7lj` and log every custom field key/value that holds files, to see the primary upload field's real name and whether it holds both images.
2. **Stop depending on the merge tag for the primary card.** In the webhook/enrichment path, treat the primary card the same way the secondary already works: read the multi-file upload field from the contact record and collect all files for the primary slot, using the merge tag only as a last resort.
3. **Widen the primary-card field matching.** The current key allowlist misses back-of-card wording (e.g. "back of insurance card", "insurance_back_link", "card back", "photo of your card"), so a separate back-image field is silently dropped. Add those patterns and keep secondary detection as-is.
4. **Correct front/back ordering by filename.** Reuse the existing filename resolution (Content-Disposition) so the image named "back" always lands in `insurance_back_link`, even when only one image exists — a lone back image should populate the back slot, not the front.
5. **Show honest labels in the portal.** When only one image is present and it resolves as a back image, display it under "Back of Card" and show the front slot as missing (with the existing upload button) instead of mislabeling it.
6. **Repair affected records.** Re-pull the primary card files for the AVA lead and any other rows with a primary front link but no back link where GHL holds two files, then verify in the portal.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: `PRIMARY_CARD_PATTERNS`, `collectInsuranceCardFiles`, `assignFrontBack`, `extractInsuranceCardSlotsWithNames`, `fetchAndUpdateInsuranceCard` (currently writes only `insurance_id_link`), plus `enrichAppointmentWithGHLData`.
- `supabase/functions/auto-parse-intake-notes/index.ts`: the `(insurance && card) || upload` branch that already handles secondary front/back — primary should share that logic.
- UI: `src/components/InsuranceViewModal.tsx` / `src/components/appointments/InsuranceCardUpload.tsx` for slot labeling.
- Redeploy `ghl-webhook-handler` and `auto-parse-intake-notes` after the change, then re-test with a fresh AVA test lead carrying distinct front/back primary images.
