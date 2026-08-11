# Fix OON mode control layout

The OON mode block on the Supported insurances tab sits in a row aligned to the bottom, but it carries a two-line hint underneath the dropdown. That extra text stretches the block, so the Clinic dropdown and the two Sync buttons float mid-row and the OON mode label rides above everything else.

## Change

In `src/components/admin/InsuranceRulesConfig.tsx` (Supported insurances toolbar):

- Switch the toolbar row from `items-end` to `items-start` so all controls line up on their labels.
- Move the "Block rules only = ... Allowlist = ..." hint out of the inline column and place it as a single full-width line below the toolbar row (next to / merged with the existing "Options are pulled from..." helper text), so no control is taller than the others.
- Give the OON mode field the same `min-w-[240px]` treatment as Clinic and let the two Sync buttons sit in their own wrapper so they stay side by side and align with the dropdowns' input line (add a spacer label or `mt-[22px]` equivalent using existing pattern).

No behavior, data, or rule-evaluation changes — presentation only.
