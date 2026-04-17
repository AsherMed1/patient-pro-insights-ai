
## Ventra Filter Bug — Two Issues

### What the data actually shows
Ventra has 4 calendars in GHL:
| Calendar | Location intent | Service intent |
|---|---|---|
| `Request Your HAE Consultation at Great Neck, NY` | Great Neck | HAE |
| `Request Your UFE Consultation at Great Neck, NY` | Great Neck | UFE |
| `Request Your UFE Virtual Consultation at Great Neck, NY` | **Virtual** | UFE |
| `Request Your Virtual Consultation at Great Neck, NY` | **Virtual** | (none — bare) |

### Bug #1 — Great Neck location filter incorrectly includes Virtual appointments
`fetchLocationAndServiceOptions` adds **"Virtual"** for any calendar matching `\bvirtual\b`, but it **also** falls through to the `at\s+(.+)$` extractor and adds **"Great Neck"** for those same Virtual calendars. Then when the user filters by location "Great Neck", the query runs `calendar_name ILIKE '%Great Neck%'` which matches the Virtual calendars too.

Same issue on the inverse side: filtering by "Virtual" runs `ILIKE '%Virtual%'` which is correct (only matches virtual calendars).

**Fix:** When a calendar is identified as Virtual, **do not** also extract a physical location from it. Treat Virtual as the exclusive location.

```ts
const isVirtual = /\bvirtual\b/i.test(calName);
if (isVirtual) {
  locations.add('Virtual');
} else {
  // existing parenthesized / "at" / "Consultation" extraction
}
```

For the **filter query**, when `locationFilter === 'Great Neck'`, exclude Virtual calendars:
```ts
if (locationFilter === 'Virtual') {
  appointmentsQuery = appointmentsQuery.ilike('calendar_name', '%Virtual%');
} else if (locationFilter && locationFilter !== 'ALL') {
  appointmentsQuery = appointmentsQuery
    .ilike('calendar_name', `%${locationFilter}%`)
    .not('calendar_name', 'ilike', '%Virtual%');
}
```

### Bug #2 — "Virtual Consultation" (bare) appointments missing from service filters
The calendar `Request Your Virtual Consultation at Great Neck, NY` strips "Virtual" → leaves empty service → skipped. Per Ventra, these bare-virtual appointments are clinically either UFE or HAE but the GHL calendar doesn't say which.

Two options:
- **A. Server-side fix only (recommended now):** Add an "All Services" option that always returns everything (already exists via `serviceFilter === 'ALL'`). The 6 "missing" virtual appointments simply have no detectable service from the calendar name. Add a synthetic **"Virtual (Unspecified)"** service entry so the user can see and filter them, plus a one-time client guidance: rename the calendar in GHL to either `UFE Virtual` or `HAE Virtual` going forward.
- **B. Detect service from intake notes:** Use the `parsed_pathology_info.procedure` field on each appointment to back-fill the service. More accurate but heavier query.

**Recommendation: A** — it surfaces the gap honestly and aligns with the client's own request to fix the GHL calendar setup. I'll add "Virtual (Unspecified)" to the service dropdown when bare-virtual calendars exist, and filter via `calendar_name ILIKE '%Virtual Consultation%'` AND not matching any known service token.

### Files
`src/components/projects/ProjectDetailedDashboard.tsx` only — the appointment manager (`AppointmentFilters.tsx`) already handles this correctly per project memory.

### Result for Ventra
- **Locations:** Great Neck (8 appts: 3 HAE + 5 UFE in-person), Virtual (35 appts: 25 UFE Virtual + 8 bare Virtual + 2 No Show etc.) — no overlap
- **Services:** HAE (3), UFE (30 = 5 in-person + 25 UFE Virtual), Virtual (Unspecified) (8) — totals match "All Services"
- **Filtering Great Neck** no longer pulls in Virtual records
- **Filtering Virtual** location returns all virtual calendars regardless of service
- Applies globally to every project — same logic shared

### Client guidance (to include in response)
Recommend the client rename the bare `Request Your Virtual Consultation at Great Neck, NY` calendar in GHL to either `UFE Virtual` or `HAE Virtual` (or split into two). Once GHL is updated, the "Virtual (Unspecified)" bucket will empty automatically.
