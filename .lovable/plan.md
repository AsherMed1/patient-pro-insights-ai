# Fix insurance card slotting (front/back swapped, secondary missing)

## What the data shows

For Test Johann (`1cce51e6-209a-4f37-93cf-8fd1f3195d33`, GHL contact `30hlzngHU1VI1xSG9Eax`, created 13:21 UTC today) the record holds:

```text
insurance_id_link    = .../documents/download/9VQJAR9fupb2s3QdFtBq
insurance_back_link  = .../documents/download/3f2iiBMJdJUJ4Pnkn9Y3
secondary_card_front_url = empty
secondary_card_back_url  = empty
```

So the multi-file extraction is working (two primary files landed), but:

1. **Front/back are reversed.** GHL upload values are opaque `documents/download/<id>` URLs with no filename in them, so the filename hints (`front` / `back`) never match and the code falls back to list order — and the order GHL sends does not match front-then-back.
2. **Secondary produced nothing.** The workflow body does send `insurance_id_link_secondary`, so the mapping is in place — the open question is what GHL substituted into it. The handler logs for the 13:21 fire have already rolled off (retention covers only the last few minutes), so this is unconfirmed. The two remaining candidates are: the merge tag `{{contact.upload_a_copy_of_your_insurance_card_secondary}}` did not resolve to the actual custom field (GHL renders an unresolved tag as an empty string, so the key on the contact may be named differently — e.g. a `(2)` / `_2` variant), or it resolved but the handler bucketed the files as primary. Both are addressed below, and step 1 makes the next fire self-diagnosing.

## Plan

### 1. Log the raw upload fields (diagnosis, keeps running in production)

In `ghl-webhook-handler`, log every custom-field key whose value contains a document URL, together with how many files each key yielded and which slot it was assigned. This makes the secondary question answerable on the next fire instead of guessed at.

### 2. Recognise every secondary naming variant

Treat a card field as secondary when its key matches `secondary`, `(2)`, `_2`, ` 2`, or `2nd` — same tolerance the insurance text extractor already uses — instead of only the literal word `secondary`. Match secondary first, then primary from the remaining fields.

### 3. Resolve real filenames instead of guessing order

Filenames are the only reliable front/back signal, and they are not in the URL. Two layers:

- If the payload carries a name alongside the URL (JSON/object shapes), keep using it.
- Otherwise issue a lightweight `HEAD` request per document URL and read the filename from `Content-Disposition`. Names like `Medicare-Card.jpg` / `2019 Card Back_v2.jpg` then classify correctly.

If a name is still unavailable for either file, keep order fallback but reverse the current assumption only if the log evidence from step 1 shows GHL consistently sends back-first — otherwise leave order as-is and rely on step 4.

### 4. Let staff correct a mis-slotted pair in the Portal

Add a **Swap front/back** control to the primary and secondary card viewers so a reversed pair is a one-click fix, regardless of what GHL sends. This is the guaranteed-correct escape hatch and is worth having permanently.

### 5. Re-fire and verify

Re-fire the workflow for Test Johann, then confirm all four slots (or the correct two) land in the right places and read the new diagnostic log line to close out the secondary question.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: extend `extractInsuranceCardSlots` (secondary key variants + per-key logging), extend `assignFrontBack` to accept resolved filenames, add an async filename resolver used on both the create path and `enrichAppointmentWithGHLData`.
- Swap control: `InsuranceCardUpload.tsx` / `SecondaryInsuranceCardUpload.tsx` write the two URLs back in reverse (primary → `insurance_id_link` / `insurance_back_link`; secondary → the two keys in `parsed_insurance_info`).
- No database migration required.
