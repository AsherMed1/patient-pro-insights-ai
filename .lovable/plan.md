
## Fix: "Virtual" as Location Across All Project Dashboards

### Problem
On the project Overview/Dashboard service dropdown, services like **"PAE Virtual"**, **"GAE Virtual"**, **"HAE Virtual"**, **"UFE Virtual"** still appear as separate procedure options. The previous fix only handled the `^Virtual\s+` PREFIX (e.g. "Virtual GAE"), but real GHL data has both prefix AND suffix patterns.

### Calendar data found across projects
Confirmed via DB query — these patterns exist:
- Prefix: "Request Your **Virtual GAE** Consultation" (ECCO Medical, etc.)
- Suffix: "Request Your **PAE Virtual** Consultation" (Arterial), "Request Your **GAE Virtual** Consultation" (Joint & Vascular), "Request Your **HAE Virtual** Consultation", "Request Your **UFE Virtual** Consultation at Great Neck, NY"
- Bare: "Request Your Virtual Consultation [at City]" / "Request Your Virtual Consultation for Knee Pain Treatment"

`AppointmentFilters.tsx` (the manager) already strips both prefix and suffix → already correct.
`ProjectDetailedDashboard.tsx` (the overview) only strips **prefix** → BUG. This is what the user is seeing.

### Fix — `src/components/projects/ProjectDetailedDashboard.tsx`
Update the service-extraction block (lines 145–159) to mirror `AppointmentFilters.tsx`:
- Strip both `^Virtual\s+` prefix AND `\s+Virtual$` suffix from the captured service text
- Continue skipping bare "Virtual" as a service
- Continue mapping In-person → GAE
- Location detection (line 119) already adds "Virtual" correctly via the `virtual\s+consultation` substring check — no change needed
- The "Virtual" location filter applied via `ilike '%Virtual%'` (line 211) already matches all Virtual calendars correctly — no change needed
- The service filter using `ilike '%GAE%'` (line 218/220) already matches "Virtual GAE", "GAE Virtual", etc. — no change needed (this means selecting service "GAE" already returns both in-person AND virtual GAE counts)

### Result
- Overview "Service" dropdown (all projects): only canonical procedures — GAE, HAE, PAE, PFE, UFE, Neuropathy, Knee Pain Treatment, etc. No more "PAE Virtual" / "GAE Virtual" / "HAE Virtual" / "UFE Virtual" entries
- Overview "Location" dropdown: Virtual + physical locations (Great Neck, Houston, Woodlands, etc.)
- Filtering by service "GAE" includes both virtual + in-person → no double counting since we count each appointment once
- Filtering by location "Virtual" returns only virtual appointments
- Applies across all projects automatically (single shared component)

### Scope
Single file edit. No DB migration. No data backfill.
