# Stop relying on GHL merge tags for insurance card images

## What the record shows right now

Test Johann's live row (`1cce51e6-209a-4f37-93cf-8fd1f3195d33`, GHL appointment `UcashHo341YCIsSQbLj4`, created 13:21 UTC, last updated 13:44 UTC):

```text
insurance_id_link         = .../documents/download/3f2iiBMJdJUJ4Pnkn9Y3
insurance_back_link       = .../documents/download/9VQJAR9fupb2s3QdFtBq
secondary_card_front_url  = empty
secondary_card_back_url   = empty
```

Two primary files landed; both secondary slots are empty. Notably, an **earlier** Test Johann row (created Aug 12) does have a secondary front URL, so the secondary path can work — which means this is a per-fire payload problem, not a permanently broken mapping. The 13:21 handler logs have already rolled off retention, so what GHL actually put into `insurance_id_link_secondary` on that fire is still unconfirmed.

## Plan

### 1. Stop guessing: make the payload self-documenting and durable

The card-field diagnostic log added earlier only survives a few minutes of log retention, which is why this keeps being unanswerable after the fact. Persist the diagnostic (field key, whether it arrived empty, file count, resolved slot) onto the appointment row itself in a small `parsed_insurance_info.card_source_debug` object, written on every fire. Then any future fire can be inspected from the database, with no reliance on log retention.

### 2. Fetch the card fields from GHL instead of trusting merge tags

Merge tags are the weak link: if the workflow's tag name doesn't exactly match the contact's custom field, GHL silently substitutes an empty string and the handler has nothing to work with. Fix it at the source:

- After extracting the payload, if either secondary slot (or either primary slot) is still empty, call the GHL contact endpoint for `contact_id` and read that contact's custom fields directly.
- Resolve field *names* via the location custom-fields endpoint so the match is on the human label ("Upload A Copy Of Your Insurance Card (Secondary)"), not on a merge-tag string the workflow author typed.
- Feed those values through the existing multi-file extractor and four-slot resolver.

This makes the workflow body's merge tags an optimisation rather than a requirement, and covers every project — not just Seamless.

### 3. Keep the non-destructive fill rule

Only fill slots that are currently empty, so a later GHL fire never overwrites an image staff uploaded in the Portal, and a manual front/back swap is never undone by a re-fire.

### 4. Apply on both paths

Run the same resolution on appointment creation and on the later contact-update/enrichment path, so cards uploaded after booking still land.

### 5. Verify

Re-fire the workflow for Test Johann, then confirm all four slots populate and read `card_source_debug` on the row to close out the secondary question for good.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: extend `collectInsuranceCardFiles` to return its diagnostics to the caller; add a `fetchCardFieldsFromGhlContact(contactId, locationId)` helper reusing the existing GHL API key/`Version: 2021-07-28` pattern already used elsewhere in the file; call it as a fallback inside `extractInsuranceCardSlotsWithNames` on the create path and in `enrichAppointmentWithGHLData`.
- Filename-based front/back ordering (`resolveFileName` / `orderFrontBackByFilename`) already exists and stays as-is; the manual "Swap front/back" control stays as the guaranteed escape hatch.
- No database migration required — the debug object lives inside the existing `parsed_insurance_info` JSONB.
