## Goal
Remove the duplicate portal record for LaQuan Skinner (Texas Endovascular - Dallas Vein Clinic), keeping the clinic-preferred one.

## Confirmed current state
Both rows exist, approved, not superseded, same appointment date Aug 3, 2026:

| Portal ID | Time | GHL appt ID | Created |
|---|---|---|---|
| 4a70d53a (KEEP) | 10:30 AM | QM3IEIcmby4SYbwwsWRb | Jul 14, 2026 |
| 17155c32 (DELETE) | 11:00 AM | 3n12T5MAgaC340hDp4Dx | Jul 26, 2026 |

## Steps
1. Delete dependent child rows referencing `17155c32` (appointment notes, QA cases/activity, review history, EMR queue, short-notice alerts, tags) so the delete isn't blocked.
2. Delete the `all_appointments` row `17155c32-44a8-430f-89ad-c7cf598649dc`.
3. Verify only `4a70d53a` remains for LaQuan Skinner in that project.

## Notes
- Portal-only deletion; nothing is changed in GHL. If the 11:00 AM booking still exists in GHL, a future webhook could recreate it — say the word if you also want that GHL event removed.
