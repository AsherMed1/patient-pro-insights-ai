# Capture back-of-card and secondary insurance card images from GHL

## Why only the primary front came through

The portal record for this contact holds one card image, and it is the GoHighLevel document link that arrived on the webhook. Nothing was ever uploaded into the portal's own storage for this appointment.

The webhook payload you pasted carries exactly one card field:

```text
"insurance_id_link": "{{ contact.upload_a_copy_of_your_insurance_card }}"
```

There is no field for the back of the primary card, and none for the secondary card front or back. The handler matches that single field and writes it to the primary front slot. So the other three images stay in GHL and never reach the portal — this is a mapping gap, not an upload failure.

## What to change

### 1. Extend the webhook payload (GHL side)

Add the three missing custom fields to both workflow payloads, e.g.:

```text
"insurance_back_link":            "{{ contact.<back of insurance card field> }}",
"secondary_insurance_front_link": "{{ contact.<secondary card front field> }}",
"secondary_insurance_back_link":  "{{ contact.<secondary card back field> }}"
```

The exact `contact.*` keys depend on how those upload fields are named in this location's contact record — I need those names (or a screenshot of the custom fields list) to finalise this snippet.

### 2. Extract all four images in the webhook handler

In `ghl-webhook-handler`, generalise the current single-card extractor into one that resolves four slots by key pattern, so it works whether the payload uses the new explicit keys or differently named upload fields:

- primary front: existing patterns (`upload a copy of your insurance card`, `insurance_card`, `front of insurance card`, …)
- primary back: `insurance_back`, `back of insurance card`, `card back`, `insurance back`
- secondary front: `secondary` + front/card patterns
- secondary back: `secondary` + back patterns

Ordering matters: check "secondary" and "back" qualifiers before the generic primary patterns so a secondary field is never mistaken for the primary card.

### 3. Write them to the right places

- primary front → `insurance_id_link` (unchanged)
- primary back → `insurance_back_link`
- secondary front/back → `secondary_card_front_url` / `secondary_card_back_url` inside `parsed_insurance_info`

Apply the same non-destructive rule the primary card already uses: only fill a slot that is currently empty, so a later webhook or GHL re-fire can't wipe an image a staff member uploaded in the portal. This covers both the initial appointment creation path and the follow-up contact-update path, so a card uploaded after booking still lands.

### 4. Backfill this contact

Once the mapping is live, re-fire the workflow for the Seamless Test contact (or pull the contact's documents directly) so all four images populate on the existing record rather than only on future bookings.

## Technical notes

- Files: `supabase/functions/ghl-webhook-handler/index.ts` (`extractInsuranceCardUrl`, `extractStandardEventFormat`, `extractWorkflowFormat`, and the contact-update merge path).
- Read paths already support all four slots (`ParsedIntakeInfo.tsx`, `DetailedAppointmentView.tsx`, `InsuranceViewModal.tsx`), so no UI or schema change is needed.
- No database migration required.
