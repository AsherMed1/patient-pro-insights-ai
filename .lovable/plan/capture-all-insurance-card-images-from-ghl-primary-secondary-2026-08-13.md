# Capture all insurance card images from GHL (primary + secondary, front + back)

## What the check shows

Primary in GHL holds **two** files (`Medicare-Card.jpg`, `2019 Card Back_v2.jpg`), and Secondary also holds two (`BCBS Card back.png`, `BCBS Card Front.png`) — four images total.

The portal record for Seamless Test stores only one:

```text
insurance_id_link            = https://services.leadconnectorhq.com/documents/download/VmueNlwFxsRE9qRtJJJO
insurance_back_link          = empty
secondary_card_front_url     = empty
secondary_card_back_url      = empty
```

The webhook now sends both upload fields (`insurance_id_link` and `insurance_id_link_secondary`), so the payload side is covered. Two handler-side gaps remain:

1. The URL extractor returns the **first** URL it finds in a field value and stops. GHL multi-file upload fields carry all files in one value, so the second primary file (the back of the card) is discarded.
2. Field matching is substring-based, and `insurance_id_link_secondary` **contains** `insurance_id_link`. As written today the secondary field would be misread as the primary card. Secondary must be matched first and excluded from the primary patterns.

## What to change

### 1. Extract every file from an upload field, not just the first

Replace the single-URL extractor with one that returns an ordered list of URLs from all supported GHL shapes: plain string (including comma/newline-separated lists), JSON string keyed by file id, and object/array forms — preserving each file's name where present.

### 2. Match secondary before primary

Resolve the secondary upload field first (keys containing `secondary`), then resolve the primary from the remaining fields, explicitly skipping any key containing `secondary`. This prevents the new `insurance_id_link_secondary` field from being mistaken for the primary card.

### 3. Assign front vs back from the file list

For each upload field, map the collected files to front/back:

- If a filename contains `back`, it is the back; if it contains `front`, it is the front.
- Otherwise fall back to order: first file = front, second file = back.

With this contact's data that yields: primary front `Medicare-Card.jpg`, primary back `2019 Card Back_v2.jpg`, secondary front `BCBS Card Front.png`, secondary back `BCBS Card back.png`.

### 4. Write the four URLs to the right slots

- primary front → `insurance_id_link`
- primary back → `insurance_back_link`
- secondary front/back → `secondary_card_front_url` / `secondary_card_back_url` in `parsed_insurance_info`

Keep the existing non-destructive rule: fill only slots that are currently empty, so a GHL re-fire never overwrites an image staff uploaded in the portal. Apply this on both appointment creation and the later contact-update path, so cards uploaded after booking still land.

### 5. Backfill this contact

Re-fire the workflow for Seamless Test once the handler is updated so all four images populate on the existing record.

## Technical notes

- File: `supabase/functions/ghl-webhook-handler/index.ts` — rework `extractUrlFromValue` into a multi-URL collector, generalise `extractInsuranceCardUrl` into a four-slot resolver with secondary-first ordering, and thread the new slots through `extractStandardEventFormat`, `extractWorkflowFormat`, and the contact-update merge.
- Read paths already render all four slots (`ParsedIntakeInfo.tsx`, `DetailedAppointmentView.tsx`, `InsuranceViewModal.tsx`), so no UI or schema change is needed.
- No database migration required.
