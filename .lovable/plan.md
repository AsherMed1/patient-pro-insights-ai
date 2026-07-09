## Plan

Delete duplicate portal record for **Michael Chabolla** (Texas Endovascular - Houston Vein Clinic).

### Record to remove
- ID: `3dc25f8f-fc7d-4536-a5f4-1eec6c2d2e92`
- Lead: Michael Chabolla
- Project: Texas Endovascular - Houston Vein Clinic
- Date of appointment: NULL
- Review status: approved
- Created: 2026-07-09

### Action
- Delete the row from `all_appointments` by UUID.
- Cascading foreign keys will clean up child records (notes, tags, reschedules, review history).

No code changes.