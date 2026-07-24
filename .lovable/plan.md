## Problem
The "Duplicate" badge in the Review Queue row header is overflowing its text. It currently uses a fixed height (`h-5`) with no vertical padding and no text-wrapping/leading control, so the label "Duplicate (N)" clips outside the badge boundary (see uploaded screenshot).

## Fix
Update the Duplicate badge in `src/components/admin/ReviewQueue.tsx` to use the same flexible layout already applied to the Short Notice badge:
- Replace fixed `h-5 py-0` with `h-auto min-h-5 px-2 py-0.5`.
- Add `whitespace-normal leading-tight inline-flex items-center gap-1`.
- Add `shrink-0` to the icon so it does not squash when space is tight.

This makes the badge grow vertically if needed and keeps the icon/text aligned without overflow.

## File to change
- `src/components/admin/ReviewQueue.tsx` (lines ~1092-1097)

## Verification
- Run TypeScript check (`tsgo` or `tsc --noEmit`).
- Open the Review Queue preview and confirm the Duplicate badge renders fully inside its border at the shown viewport size.