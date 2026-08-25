# Fix duplicated primary insurance card (front = back)

## What the data shows

For the AVA Vascular test record (`AVA TEST DO NOT TOUCH`, created Aug 25 19:05 UTC), the primary card front and back are the **same** GHL file:

```text
insurance_id_link   = .../documents/download/HuRdckqtGKfDqejxC61l
insurance_back_link = .../documents/download/HuRdckqtGKfDqejxC61l
secondary_card_front_url = .../pOyEfRiozHixnRR4Q9Ix
secondary_card_back_url  = .../5oA9q8jW6meD3EomtZaP   <- correct, two distinct files
```

The stored intake notes carry that same single primary URL through the GHL merge tag line (`insurance_id_link: https://.../HuRdck...`), and the contact also exposes an upload field for the primary card holding the same file.

Cause: when the webhook collects card files, duplicate URLs are only filtered **within one custom field**, not across fields. The primary card therefore arrives twice — once from the `insurance_id_link` merge tag and once from the "Upload a copy of your insurance card (Primary)" upload field — and the front/back assigner takes "first file = front, second file = back", putting the identical image in both slots. Secondary is unaffected because its two files are genuinely different. Database-side merge and the portal upload component do not duplicate; only this collection step does.

Two rows in the database currently have `insurance_id_link = insurance_back_link`.

## Fix

1. **Deduplicate card files per slot, across all fields.** In `ghl-webhook-handler`, make the collection step keep one entry per URL for the whole primary set and the whole secondary set, instead of per field. The same file referenced by a merge tag and an upload field then counts once, so a single-image primary card yields front only and back stays empty.

2. **Add a safety guard in the front/back assigner.** Never return the same URL for both slots: if the chosen back equals the chosen front, drop the back. This also protects the filename-aware path and any future field that repeats a file.

3. **Guard the persistence call.** Skip writing a primary/secondary back URL when it is identical to the front URL being written for that pair, so no future path can re-introduce a duplicate.

4. **Repair the affected rows.** Clear `insurance_back_link` where it equals `insurance_id_link` (2 rows, including the AVA test record), so the portal shows a single front image and an empty Back of Card slot ready for a real upload.

5. **Verify.** Re-check the AVA test record in the portal: primary shows one image with the back slot empty, secondary keeps its two distinct images.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: `collectInsuranceCardFiles` (shared URL `Set` per slot), `assignFrontBack` (front/back identity guard), `persistInsuranceCardSlots` (drop back when equal to front). Both `extractInsuranceCardSlots` and `extractInsuranceCardSlotsWithNames` inherit the fix.
- Data repair is a one-off update on `all_appointments`; no schema change and no UI change required.
- Redeploy of `ghl-webhook-handler` is needed for the ingestion fix to take effect.
