# Make secondary insurance cards persist reliably

## What the latest test proves

The newest Seamless Test Johann record is `2eb37c8f-e5cb-4f15-9a78-13040116202f` (created 14:22 UTC). The webhook and GHL enrichment both found the secondary cards:

```text
workflow payload secondary: .../c1c8xH9z5Mkch4DxpX97
GHL enrichment secondary front: .../FPPZbvLD4xXGpVYrPOGD
GHL enrichment secondary back:  .../c1c8xH9z5Mkch4DxpX97
```

The enrichment reported a successful database update, but the record now has neither `secondary_card_front_url` nor `secondary_card_back_url`. The primary pair remained. This confirms GHL is sending the files correctly; a later writer is replacing the entire `parsed_insurance_info` JSON object and removing the secondary keys.

## Plan

### 1. Make card persistence atomic in the database

Add a narrowly scoped database function that updates the four insurance-card slots directly against the row's current values in one statement:

- Fill empty primary and secondary slots from GHL.
- Preserve staff-uploaded Portal cards.
- Allow correction only when the same complete primary pair is proven to be reversed by clear filename evidence.
- Never replace the full `parsed_insurance_info` object from a stale application snapshot.

This removes the read-merge-write race that remains possible even with a just-in-time read.

### 2. Route every GHL card write through the atomic function

Use the same persistence path after:

- Initial workflow appointment creation.
- Full GHL contact enrichment.
- Later contact-update webhooks.

Keep insurance text parsing separate from card persistence so an AI parser or contact enrichment cannot accidentally remove card URLs.

### 3. Stop the parser from owning card keys

Before `auto-parse-intake-notes` writes `parsed_insurance_info`, strip the secondary card URL keys from its payload. The parser may update provider, plan, member ID, and group number, but card slots remain owned by the atomic card persistence path.

### 4. Add concurrency regression coverage

Test that:

- A stale parser update cannot erase existing secondary cards.
- Two overlapping enrichments preserve all four slots.
- Clearly named front/back files are placed correctly.
- Ambiguous filenames preserve arrival order.
- Portal-uploaded cards are never overwritten.

### 5. Repair and verify the latest Test Johann

Re-run card enrichment for the latest GHL contact `p91Kk2KZuvrFRU0ZFVzX`, then verify the database and Portal display both secondary images after all parser activity finishes.

## Technical details

- Database migration: add a parameterized `SECURITY DEFINER` card merge function with a fixed `search_path`; grant execution only to the service role used by Edge Functions.
- Edge Functions: update `ghl-webhook-handler` to call the merge function and update `auto-parse-intake-notes` so it never writes card URL keys.
- No UI or table-column change is required; the existing secondary insurance component already reads the correct keys.
