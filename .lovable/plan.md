## What I found
- There is no `Test Johann New` record in `all_appointments` right now.
- Recent `ghl-webhook-handler` logs do not show a Horizon webhook for that name or Horizon’s location ID.
- The current webhook parser only accepts payloads that look like an appointment/workflow webhook with `calendar`, `contact_id`, or `first_name`. Horizon’s no-appointment lead workflow may be sending a contact/custom-fields payload shape that is currently treated as “unsupported” instead of being created as an unscheduled lead.

## Plan
1. **Broaden supported no-appointment lead payloads**
   - Update `ghl-webhook-handler` to recognize contact/lead-style workflow payloads without a `calendar` object when they include enough patient identity data and a known unscheduled-capture project/location.
   - Keep the existing `contact_notes_only` guard first so notes-only updates still never create appointments.

2. **Map Horizon by location ID as a fallback**
   - If the payload has `location.id` but no `location.name`, resolve it through the `projects` table using `ghl_location_id`.
   - This prevents Horizon leads from being rejected or auto-created under the wrong project name.

3. **Create only safe unscheduled rows**
   - For ECCO, Premier Vascular, Davis Vein & Vascular, and Horizon Vascular Specialists, create rows with:
     - `date_of_appointment = null`
     - `requested_time = null`
     - `is_unscheduled = true`
     - `time_preference` from Morning/Afternoon/Evening/No Preference fields when present
     - `review_status = pending` unless the existing Setter Submitted bypass applies
   - Continue skipping terminal/cancelled records and continue blocking `contact_notes_only` from creating anything.

4. **Verify with database/log checks**
   - Confirm the handler can parse a Horizon no-appointment payload shape.
   - After implementation, check that a new Horizon test lead lands in Review Queue / Unscheduled instead of disappearing.