## Problem

Davis Vein & Vascular is a **hybrid** unscheduled-capture project: leads can arrive as contact-only (no calendar slot → placeholder with `is_unscheduled=true`, `time_preference` set) or as fully-scheduled appointments (real `ghl_appointment_id`, `date_of_appointment`).

When both webhooks arrive for the same contact — placeholder first, then the real appointment — the second webhook creates a **duplicate row** instead of promoting the placeholder. That is why Sandra Pongrass has two rows sharing `ghl_id=RQBRYUEB6nGO69GO1euo`:

- `c2b262a5…` — created 17:06 UTC, unscheduled, `ghl_appointment_id=NULL`, `time_preference=no_preference`
- `4994537b…` — created 17:09 UTC (3 min later), scheduled Jul 27 09:00, `ghl_appointment_id=uNAHhfZyS5Fj1yN12H3V`

Same pattern found for **Verlecia Wilson Thomas** (ghl_id `b5i3LhuB8Y5BNlTUnSqj`, Davis). Those are the only two active Davis contacts with a placeholder + scheduled sibling right now.

## Root cause

`findExistingAppointment` in `supabase/functions/ghl-webhook-handler/index.ts` (~L1581):

1. Match by `ghl_appointment_id` + project → placeholder has NULL, no hit.
2. Reactivation lookup requires `status` to be a terminal one — the placeholder is `Confirmed`, so it's skipped.
3. Contact-ID fallback only runs when `ghl_appointment_id` is absent from the payload.

Net: real-appointment webhook never sees the placeholder → inserts a new row.

## Fix

### 1. Handler change (`supabase/functions/ghl-webhook-handler/index.ts`)

In `findExistingAppointment`, right after the `ghl_appointment_id` project-scoped lookup misses and before the reactivation block, add a **placeholder-promotion lookup** used only when both `ghlAppointmentId` and `ghlId` are present:

- Query `all_appointments` where `ghl_id = ghlId`, `project_name = projectName`, `ghl_appointment_id IS NULL`, `is_unscheduled = true`, `is_superseded = false`, ordered by `created_at ASC`, limit 1.
- If a row is returned, log `PLACEHOLDER PROMOTION` and return it. The existing UPDATE path in `getUpdateableFields` (Davis-hybrid branch) will then fill in `date_of_appointment`, `requested_time`, `ghl_appointment_id`, and flip `is_unscheduled=false` on the same row.

This is scoped to placeholders only (`ghl_appointment_id IS NULL AND is_unscheduled=true`), so it cannot hijack legitimate scheduled rows in any project — it works for Davis today and stays safe if Premier/ECCO/Horizon ever go hybrid later.

Also ensure the Davis-hybrid UPDATE branch clears `is_unscheduled` and `time_preference` when a real date arrives (verify current code; add if missing).

### 2. One-time data repair (insert tool)

For each duplicate pair identified:

- Sandra Pongrass: mark `c2b262a5-21e5-4896-9eb0-a60a1af4bd7b` (placeholder) as `is_superseded=true`. Keep scheduled row `4994537b…`.
- Verlecia Wilson Thomas: same treatment — supersede placeholder `37c8679c-68dd-4a69-ad35-8692e47a06b5`, keep scheduled `32dbf867…`.

Also re-scan Davis after the fix for any other `ghl_id` with a placeholder + scheduled sibling and supersede placeholders the same way (query already run — only these two exist right now).

## Out of scope

- Davis rows that are unscheduled with no time_preference but have no scheduled sibling (Abron Johnson, Michael Daigle, Terry Sadler, Loretta Brown Freddie) — these are stand-alone leads that never got a follow-up appointment webhook. Not the duplication bug. I'll flag them in the completion report but not modify them without your call.
- Premier / ECCO / Horizon behavior — unchanged (strict unscheduled).

## Report back

After the fix + repair, I'll confirm Sandra's portal shows only the Jul 27 09:00 row and list Verlecia's status plus any other Davis leads that legitimately have neither a date nor a time preference.