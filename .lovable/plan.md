## Diagnosis

Pulled the actual records from the database to compare what's stored vs. what should render.

**What's in the database is fine:**
- Premier Vascular unscheduled records (Arthur J Dwight, Holli Lee, Rebecca Mayer, Priscilla Butler) all have `parsed_pathology_info` populated with `procedure_type: GAE`, symptoms, pain level, etc., and `parsing_completed_at` is set.
- ECCO Medical has **zero** rows with `is_unscheduled = true` so far — every ECCO record is still being booked with a `date_of_appointment`. Their unscheduled flow is wired in `ghl-webhook-handler` and `all-appointments-api` but no GHL webhook has actually fired with the unscheduled payload yet.

**Why no procedure tag shows at the top of the card:**
The appointment card header only renders these badges: Status, Procedure Ordered, Wound+, Agent, GHL Sync. There is **no procedure-type tag** (GAE/PFE/UFE/etc.) anywhere at the top of the card today. The only "Pathology:" label lives inside the amber Medical Information block far down the card, which is easy to miss and is also gated on `parsing_completed_at`. For Premier unscheduled records that come in via a contact-only webhook (`calendar_name = "Unknown"`), the in-card "Procedure" select also has nothing to anchor to visually.

**Why ECCO still has no unscheduled rows:**
ECCO Medical is included in `UNSCHEDULED_PROJECTS` in both edge functions, but the GHL sub-account is still pushing booked appointments. We need to confirm with the client whether their GHL form/calendar has actually been switched to the unscheduled-capture flow on ECCO's side.

## Plan

1. **Add a procedure-type tag to the top of the appointment card.**
   - In `AppointmentCard.tsx`, next to the existing Status / Procedure Ordered badges, render a "Procedure" badge sourced from (in order): `parsed_pathology_info.procedure_type` → calendar-name keyword (GAE/PAE/UFE/PFE/HAE/PAD/FSE/TAE) → `null`.
   - Use the existing procedure color tokens from the Calendar View Colors memory (Orange/GAE, Blue/PFE, Teal/UFE, Purple/PAE, Pink/HAE, Red/PAD).
   - Render the badge for **all** appointments, not just unscheduled — so it solves the "I can't see what they're scheduled for" problem at a glance for every project.

2. **Don't gate the procedure tag on `parsing_completed_at`.**
   - The amber Medical Information section can stay gated, but the top-of-card procedure badge should fall back to calendar-name detection when AI parsing hasn't run yet, so it never appears blank.

3. **For unscheduled Premier/ECCO records with `calendar_name = "Unknown"`, surface the procedure from parsed pathology.**
   - These records are coming through a contact-level webhook that has no calendar payload, so `calendar_name` is "Unknown" and the badge would otherwise be empty. Reading `parsed_pathology_info.procedure_type` (already populated by the AI parser from the intake notes) covers this case.

4. **Confirm ECCO's unscheduled webhook is actually being sent.**
   - Tell the user that ECCO has zero `is_unscheduled = true` rows so far, so the code path is ready but GHL on ECCO's side may still need to switch the form/calendar to the unscheduled flow before any leads come through that way.

5. **Verify after deploy.**
   - Reload Premier Vascular project → Arthur J Dwight, Holli Lee, Rebecca Mayer should now show a colored procedure badge ("GAE") at the top of their cards. Once ECCO starts sending unscheduled leads, the same badge will appear there.

## Files to change

- `src/components/appointments/AppointmentCard.tsx` — add the procedure-type badge in the existing badge row (~line 1626-1635), with the resolution + color logic.

No backend, database, or edge-function changes required — the data is already correct.