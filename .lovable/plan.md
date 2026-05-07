## Plan: PAD Wound Indicator + Ticket Service Field

### Part 1 — PAD Wound Indicator on Patient Record

**Where it shows up:** Status/badge row of `AppointmentCard.tsx` (next to the Confirmed/Procedure badges), so the clinic sees it immediately when scanning the New / Needs Review tabs without expanding the card. Also surface it in the expanded Pathology section of `ParsedIntakeInfo.tsx`.

**Trigger condition:**
- Procedure is PAD (calendar name contains "PAD" OR `parsed_pathology_info.procedure_type === 'PAD'`).
- AND the wound is positive. We treat any of these as "wound = yes":
  - `parsed_pathology_info.open_wounds` value contains "YES" / "yes" / "open" / a free-text wound description (i.e. value is present and not "NO" / "None" / empty).
  - OR `parsed_pathology_info.symptoms` contains "open wound" / "wound" / "sore" / "ulcer".

**Visual:** Red destructive badge with an AlertTriangle icon labeled `Wound +`. Tooltip shows the raw `open_wounds` text so the clinic can read the wound details on hover. Inside `ParsedIntakeInfo`, add a dedicated row "Open Wounds" displaying the value with the same red treatment.

**No DB changes** — the data already lives in `parsed_pathology_info.open_wounds` (the auto-parser already extracts it; see `auto-parse-intake-notes/index.ts` lines 778-783, 1230-1234).

### Part 2 — Add Service field to Support Ticket Form

**Where:** `src/components/support-widget/tickets/TicketForm.tsx`. Add a new required dropdown labeled **"Which service is affected?"** between Category and Priority.

**Options:** PAE, UFE, GAE, HAE, PAD, FSE, TAE, Other / N/A.
(Adds the three requested — PAD, FSE, TAE — alongside the existing service lines so the form stays useful across all clinics.)

**Storage:** Save the selection into the existing `support_tickets.metadata` JSONB column as `{ service_affected: "PAD" }`. No schema migration required.

**Display:** Update `SupportQueueManager` (admin ticket list) to render the service tag next to the category badge so Ops can filter/scan tickets by service.

### Files to change

- `src/components/appointments/AppointmentCard.tsx` — add wound badge in the status row (PAD + wound=yes).
- `src/components/appointments/ParsedIntakeInfo.tsx` — render Open Wounds row in pathology section.
- `src/components/support-widget/tickets/TicketForm.tsx` — add Service dropdown, persist to `metadata`.
- `src/components/SupportQueueManager.tsx` — show `metadata.service_affected` in ticket list.

### Out of scope
- No GHL / parser changes (open_wounds extraction already works).
- No new DB columns; reuse existing `parsed_pathology_info.open_wounds` and `support_tickets.metadata`.