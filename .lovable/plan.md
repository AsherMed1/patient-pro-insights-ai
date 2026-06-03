## Problem

You renamed the `projects` row from **Vascular Solutions of North Carolina** → **Rao Clinic**, but only the parent `projects` table was updated. Every child table still references the old name as a string, so the portal at `/project/Rao%20Clinic` has zero linked data (appointments, calls, leads, notes, etc. are orphaned under the old name).

Counts still on the old name:
- all_appointments: 630
- appointment_notes (via appts): 1,235
- new_leads: 1,026
- all_calls: 1,264
- speed_to_lead_stats: 124
- short_notice_alerts: 4
- project_messages: 0

Code references to "VSNC" in `AppointmentFilters.tsx`, `LocationLegend.tsx`, `ProjectDetailedDashboard.tsx` are all comments — no behavior depends on the name. No `.ts` utility hardcodes the old string.

## Fix

**1. SQL migration** — rename the string across every table that carries `project_name` (and a few related columns), in a single transaction:

```sql
UPDATE all_appointments       SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE new_leads              SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE all_calls              SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE speed_to_lead_stats    SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE short_notice_alerts    SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE project_messages       SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE appointment_reschedules SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE emr_processing_queue   SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE insurance_fetch_queue  SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE support_tickets        SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE support_conversations  SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE pending_dnd_releases   SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE patient_data_access    SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE help_videos            SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE help_articles          SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE facebook_ad_spend      SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE creative_projects      SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE call_sync_cursors      SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE ghl_subaccounts        SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
UPDATE recapture_events       SET project_name='Rao Clinic' WHERE project_name='Vascular Solutions of North Carolina';
-- agent_performance_stats and csv_import_history don't have project_name column; skip
```

Also check tables that reference by other keys/columns: `project_user_access`, `project_forms`, `project_tags`, `project_id` lookups — these use `project_id` UUID, not the name, so they remain intact automatically.

**2. Memory updates** — two memory files reference VSNC by the old branding. Rename them to "Rao Clinic" so future agents use the correct label:
- `mem://projects/vsce/virtual-as-location` (VSNC Virtual Location rule)
- Index entry: "VSNC Virtual Location"

**3. Code comments (optional cleanup)** — update VSNC mentions in three comments to "Rao Clinic" for clarity. No functional change.

## Verification

After migration:
- Reload `/project/Rao%20Clinic` — appointments, leads, calls, dashboards should populate.
- Confirm GHL webhook keeps mapping correctly: `ghl_location_id=Natyl1sRTZCGu7VXrgAz` → "Rao Clinic" (already correct in `projects` table, so future inbound syncs write the new name).
