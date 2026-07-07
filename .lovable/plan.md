# Fix: Service filter double-counts when calendar and parser disagree

## What's actually happening

Lorenda Hill's row has:
- `calendar_name` = "Request your GAE Consultation at Macon, GA"
- `parsed_pathology_info.procedure` = **GAE** (derived from calendar name)
- `parsed_pathology_info.procedure_type` = **PFE** (what the AI parser concluded from the intake notes)

The badge in the UI reads `procedure_type`, so she correctly displays as **PFE**. But after my last fix the Service filter now matches on calendar_name OR procedure OR procedure_type, so she matches BOTH the GAE filter (via calendar/procedure) AND the PFE filter (via procedure_type). That's why GAE went from 23 → 24 and totals no longer reconcile (24 + 6 = 30, but All Services = 29 because she's a single distinct row).

Same class of bug will hit any row where the calendar says one procedure but the parser overrode it based on the actual pathology.

## Fix — one source of truth: `procedure_type`

`procedure_type` is what the badge, the patient card, and every downstream summary already display. The Service filter must use the same field so filter results match what the user sees on screen.

### `src/components/AllAppointmentsManager.tsx`

Update all four Service filter branches (count query ~L285, appointments query ~L426, export query ~L575, Excel export ~L1570) so each service option resolves through `procedure_type` first, with a fallback ONLY when `procedure_type` is null:

```
parsed_pathology_info->>procedure_type.eq.<SERVICE>,
and(parsed_pathology_info->>procedure_type.is.null,
    or(calendar_name.ilike.%<SERVICE>%,
       parsed_pathology_info->>procedure.eq.<SERVICE>))
```

Net effect:
- If the parser assigned a `procedure_type`, that value alone decides which Service bucket the row belongs to.
- If the parser never ran / never produced one, we fall back to calendar_name + legacy `procedure` so unparsed rows still bucket somewhere.
- No row can appear in two Service buckets.

Keep the special GAE ↔ "In-person" mapping for Ally Vascular, but apply the same "procedure_type wins, fallback only when null" pattern inside that branch too.

### Verification

Re-run Premier Vascular, Created Date Jun 1–30:
- All Services = 29
- GAE = 23 (Lorenda drops out)
- PFE = 6 (Lorenda stays here, matching her badge)
- UFE = 0
- 23 + 6 + 0 = 29 ✅

Also spot-check that unparsed rows (older data with no `procedure_type`) still show up under the calendar-derived service — that's the fallback branch's job.

## Not in scope

- No schema change, no backfill, no edge function change.
- Not touching the parser's rules for when to override the calendar — the parser is correct to say Lorenda is PFE based on her intake notes; the filter just needs to agree with the badge.
