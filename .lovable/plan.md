## Goal

Make bad dates of birth impossible to miss in the Review Queue by showing a red **Invalid DOB** tag next to the patient's name whenever the birth year equals the current year.

## What changes

**1. Detection rule (frontend only, no DB change)**
- Source: `all_appointments.dob`, falling back to `parsed_demographics.dob` — the same fallback already used in the row detail panel.
- Flag as invalid when the parsed birth year equals the current year. Also flag future-dated DOBs (year greater than current), since those are the same data-entry error class and would otherwise stay silent.
- Missing DOB is *not* flagged — that's a separate gap, not an invalid value.

**2. Row badge**
- New red/destructive-toned outline badge with an alert icon, rendered next to the existing Duplicate and Short Notice badges on each Review Queue row.
- Tooltip: "Date of birth uses the current year — please correct before approving."
- Shows in the Pending view (and Declined view stays as-is, badge suppressed like the other tags).

**3. Detail panel highlight**
- In the expanded row, the DOB field value is shown in the destructive color with a short "Invalid" note, so a setter who opens the row sees it at the point of correction. The existing "Edit Name / DOB" control is already there to fix it.

**4. Count chip**
- Add an "Invalid DOB" count chip alongside the existing Short Notice chip in the queue header, so supervisors can see at a glance how many pending appointments have the issue.

## Not included (say the word if you want them)

- Blocking approval when the tag is present (currently it stays advisory only).
- Writing a tag back to the GHL contact.
- Any backfill or automatic correction of existing bad DOB values.

## Technical notes

Single file: `src/components/admin/ReviewQueue.tsx`. A small `isInvalidDob(row)` helper derived from `row.dob || row.parsed_demographics?.dob`, used in three places (row badge, detail DOB field, header count). Uses existing semantic destructive tokens — no new colors, no schema or edge-function work.
