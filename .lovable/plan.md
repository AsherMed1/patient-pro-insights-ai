# Fix insurance card slotting and preserve secondary uploads

## What the latest test proves

Test Johann (`94b4c6bd-a1e0-4cc4-ac52-aca602d2b3c0`, GHL contact `yIQxnzbJAJamDKdBYVUI`) reached the webhook with both merge tags populated:

```text
primary payload:   .../wTXcLrCOTWzMxWUoACRx
secondary payload: .../QvgLrW0uJ65LNOfo5HSU
```

The GHL contact enrichment then found all four files:

```text
primary:   wTXc... + PDHp...
secondary: QvgL... + 4hPd...
```

However, filename lookup returned empty names for all four files, so the existing order fallback remained unchanged. The database currently retains the two primary URLs but no secondary URLs.

The secondary loss is consistent with overlapping webhook/enrichment work writing `parsed_insurance_info` from stale snapshots: one enrichment found all four cards, while another enrichment for the same row ran seconds later with no card files and wrote an older JSON object back over the first result.

## Plan

### 1. Make filename detection best-effort and explicit

For every GHL card file, resolve the original filename from the richest available source in this order:

1. Name/metadata already included in the GHL custom-field value.
2. `Content-Disposition` from the document response, including robust quoted and RFC 5987 filename parsing.
3. Filename-bearing redirect/final URL metadata when available.

Classify only on clear, case-insensitive filename words such as `front`, `back`, `front side`, or `back side`. If the names do not clearly identify the sides, preserve the current arrival-order handling exactly as requested—no guessing or automatic reversal.

### 2. Prevent concurrent enrichment from erasing cards

Immediately before writing enrichment results, re-read the row's latest `parsed_insurance_info` and card columns, then merge onto that current state rather than the appointment snapshot captured earlier in the request.

Keep the existing non-destructive rule:

- Fill an empty primary or secondary slot.
- Never replace a card already stored by the Portal or an earlier webhook.
- A webhook that contains no card files must never remove stored card URLs.

### 3. Apply the same resolver everywhere

Use one filename-aware four-slot resolver for:

- Initial workflow appointment creation.
- Full GHL contact enrichment.
- Later contact-update webhook processing.

This avoids the current difference where the initial payload sees one URL per field while enrichment later discovers both files.

### 4. Add regression coverage

Cover these cases with focused Edge Function tests:

- Obvious `front` and `back` filenames arrive in reverse order and are corrected.
- Ambiguous filenames retain arrival order.
- Primary and secondary multi-file fields populate all four slots.
- A concurrent/no-card enrichment cannot erase secondary URLs already written.
- Existing Portal-uploaded cards are never overwritten.

### 5. Verify with the latest Test Johann record

After deploying the handler, re-run enrichment or re-fire the workflow for contact `yIQxnzbJAJamDKdBYVUI`, then confirm:

- All four URLs remain stored after parsing and any subsequent webhook.
- Clearly named files occupy their matching front/back slots.
- Ambiguous names keep their existing order.

## Technical notes

- Main file: `supabase/functions/ghl-webhook-handler/index.ts`.
- Extend `resolveFileName`/`withResolvedNames`; keep `assignFrontBack`'s current order fallback.
- Replace stale-snapshot JSON merging in `enrichAppointmentWithGHLData` with a just-in-time row read and non-destructive merge.
- No database migration is required.
