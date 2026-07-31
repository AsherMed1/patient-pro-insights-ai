# Keep phone number with patient name in Review Queue rows

## Problem

The previous badge fix moved the Duplicate / Short Notice / Invalid DOB badges to their own wrapping line under the patient name, but the patient's phone number also ended up on its own separate line below the badges. The user wants the phone number to stay visually grouped with the patient name.

## The fix

1. Move the phone number onto the same line as the patient name, directly after the name button.
2. Keep the badges on a separate wrapping line below the name + phone row.
3. Preserve the existing overflow/wrap protection (`min-w-0`, `break-words`) so long names or phone numbers still wrap inside the Patient column instead of spilling into the Project column.
4. Keep the chevron toggle, loading ellipsis, declined reviewer metadata, and all existing row actions unchanged.

## Technical notes

- File: `src/components/admin/ReviewQueue.tsx`, around the Patient cell renderer (lines ~1256–1312).
- Current structure: name row → badge row → phone row → declined metadata.
- New structure: name + phone row → badge row → declined metadata.
- Implementation options:
  - Wrap the name button and phone number in a single flex container with `flex-wrap` and `gap-1`/`gap-2`, or
  - Append the phone number as an inline `span`/`div` inside the name row with `shrink-0`/`min-w-0` so it wraps with the name when space is tight.
- Keep badges in their existing `flex flex-wrap items-center gap-1 mt-1` container so they continue to wrap independently.
- No changes to data fetching, badge logic, sorting, actions, or decline behavior.
