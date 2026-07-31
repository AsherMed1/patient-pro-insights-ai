# Fix overlapping badges in the Review Queue rows

## Problem

In the Pending Review list, the Duplicate / Short Notice / Invalid DOB badges sit on the same single line as the patient name. That line cannot wrap and the column has no minimum-width protection, so the badges spill out of the Patient column and print on top of the Project column text ("Vascular and Embolization Specialists" appearing behind the Short Notice pill).

## The fix

1. Move the badges to their own line directly under the patient name instead of sharing the name's line.
2. Let that badge line wrap onto multiple lines when several badges are present, so it grows downward rather than sideways.
3. Constrain the Patient cell so its content can never paint over the neighbouring Project column; long patient names wrap instead of overflowing.
4. Keep the Project column text wrapping normally so it stays fully readable next to a tall Patient cell.

Row height grows slightly for rows with badges; nothing about the badge logic, counts, sorting, or actions changes.

## Technical notes

- File: `src/components/admin/ReviewQueue.tsx`, row renderer around the Patient cell (the `flex items-center gap-1` block holding the name button and the three `Badge` elements).
- Split into: name row (chevron + name button) and a second `flex flex-wrap gap-1 mt-1` container holding the Duplicate / Short Notice / Invalid DOB badges.
- Add `min-w-0` to the Patient cell wrapper and `break-words` to the name button so the grid column clips/wraps correctly.
- No changes to data fetching, badge conditions, or the Declined view behaviour.
