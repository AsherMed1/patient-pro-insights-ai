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

Two separate gaps cause this:

1. The webhook payload only maps one card field (`insurance_id_link` = the Primary upload field). The Secondary upload field is not sent at all.
2. The handler's URL extractor returns the **first** URL it finds in the field value and stops. GHL multi-file upload fields carry all files in one value, so the second primary file (the back of the card) is discarded.

## What to change

### 1. Extract every file from an upload field, not just the first

Replace the single-URL extractor with one that returns an ordered list of URLs from all supported GHL shapes: plain string (including comma/newline-separated lists), JSON string keyed by file id, and object/array forms — preserving each file's name where present.

### 2. Assign front vs back from the file list

For each upload field (primary and secondary), map the collected files to front/back:

- If a filename contains `back`, it is the back; if it contains `front`, it is the front.
- Otherwise fall back to order: first file = front, second file = back.

With this contact's data that yields: primary front `Medicare-Card.jpg`, primary back `2019 Card Back_v2.jpg`, secondary front `BCBS Card Front.png`, secondary back `BCBS Card back.png`.

### 3. Add the Secondary upload field to the webhook payload

The Secondary upload field is absent from the payloads you pasted. Add it to both workflows, e.g.:

```text
"secondary_insurance_card_link": "{{ contact.upload_a_copy_of_your_insurance_card_secondary }}"
```

The handler will also match on key patterns (`secondary` + `insurance card`) so it works even if the field key differs slightly.

### 4. Write the four URLs to the right slots

- primary front → `insurance_id_link`
- primary back → `insurance_back_link`
- secondary front/back → `secondary_card_front_url` / `secondary_card_back_url` in `parsed_insurance_info`

Keep the existing non-destructive rule: fill only slots that are currently empty, so a GHL re-fire never overwrites an image staff uploaded in the portal. Apply this on both appointment creation and the later contact-update path, so cards uploaded after booking still land.

### 5. Backfill this contact

Re-fire the workflow for Seamless Test once the mapping is live so all four images populate on the existing record.

## Technical notes

- File: `supabase/functions/ghl-webhook-handler/index.ts` — rework `extractUrlFromValue` into a multi-URL collector, generalise `extractInsuranceCardUrl` into a four-slot resolver, and thread the new slots through `extractStandardEventFormat`, `extractWorkflowFormat`, and the contact-update merge.
- Read paths already render all four slots (`ParsedIntakeInfo.tsx`, `DetailedAppointmentView.tsx`, `InsuranceViewModal.tsx`), so no UI or schema change is needed.
- No database migration required.
