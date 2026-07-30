## One-off XLSX export: duplicates + missing info

Read-only query against `all_appointments` (active rows only, `is_superseded IS NOT TRUE`), delivered as a single workbook to `/mnt/documents`.

### Verified current counts (active rows: 23,217)
| Bucket | Count |
|---|---|
| Duplicate groups by GHL contact + project | 4 |
| Duplicate groups by patient name + project | 251 |
| Missing Insurance Information | 192 |
| Missing Medical / PCP Information | 2,040 |
| Missing Pathology Information | 12 |
| Missing DOB | 4,320 |

### Workbook: `portal_duplicates_and_missing_info.xlsx`

**Sheet 1 — Summary**
Counts per bucket, plus a per-clinic breakdown so you can see which projects drive the totals.

**Sheet 2 — Duplicates**
One row per duplicate record, grouped so the set is visually adjacent. Columns: Group Key, Project, Patient Name, Portal ID, GHL Contact ID, GHL Appointment ID, Appointment Date, Status, Review Status, Created At, Has Intake Notes, Suggested Keep (the newest non-terminal row in each group).
Two match types flagged in a `Match Type` column: `contact_id` (same GHL contact, same project) and `name` (same normalized name, same project) so you can trust the contact-ID matches and eyeball the name matches.

**Sheet 3 — Missing Info**
One row per record with at least one empty card. Columns: Project, Patient Name, Portal ID, Appointment Date, Status, plus a Yes/No column for each of Insurance, Medical/PCP, Pathology, DOB, and a `Fixable` flag (Yes = intake notes contain text the parser could still extract; No = the source notes genuinely lack the data).

**Sheet 4 — Missing Info by Clinic**
Pivot of the above: clinic × missing-field counts, sorted worst-first, for prioritizing remediation.

### Notes
- Purely read-only — no records are modified, no statuses touched.
- Superseded rows are excluded so the duplicate list reflects only what clinics actually see.
- QA of the workbook before delivery: verify row counts match the SQL totals and that no sheet has clipped or misaligned columns.

### Open scope choices (I'll use these defaults unless you say otherwise)
- All projects (including small/inactive ones), excluding `PPM - Test Account`.
- No date limit — full history rather than just recent appointments.
