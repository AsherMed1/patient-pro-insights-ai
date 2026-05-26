# Import Missing Leads + Backfill from GHL

Import 37 patients listed in `Missing leads report - Sheet1.csv` into `all_appointments`, mapped to their project, then enrich each from GHL using the embedded contact ID.

## Approach

For each row I extract:
- **project_name** — from the section header above the row (e.g. "Buffalo Vascular Associates")
- **ghl_contact_id** — last path segment of the URL (e.g. `0uAhuVefotgbDnBVaHyr`)
- **ghl_location_id** — from `/location/{id}/` in the URL (used to verify project mapping)
- **lead_name / phone / email** — for fallback when GHL lookup fails

## Steps

1. **One-off Node script (`/tmp/import-missing-leads.ts`)** — parses the CSV, builds the rows, and POSTs them in one batch to a new edge function. Not added to the app codebase.

2. **New edge function `import-missing-leads-from-ghl`** — accepts `[{ project_name, ghl_contact_id, fallback_name, fallback_phone, fallback_email }]`. For each entry:
   - **a.** Verify project exists in `projects` table; skip + report if not.
   - **b.** Check `all_appointments` for an existing row with this `ghl_id` in the same project — if present, skip (don't duplicate); just trigger backfill on the existing row.
   - **c.** Fetch contact from GHL `/contacts/{contactId}` → name, phone, email, DOB, custom fields, tags.
   - **d.** Fetch most recent appointment from GHL `/contacts/{contactId}/appointments` (sorted desc, take latest).
   - **e.** Insert a single `all_appointments` row using the latest appointment's date/time/calendar if found; otherwise insert a Needs-Review shell (NULL date, status Confirmed) per the unscheduled-capture pattern.
   - **f.** Populate `lead_name`, `lead_phone_number`, `lead_email`, `ghl_id`, `ghl_appointment_id`, `ghl_location_id`, `patient_intake_notes` (raw GHL notes string), and `review_status='pending'` (auto-approved for Davis/Premier/ECCO per existing exempt list).
   - **g.** Existing DB triggers handle the rest: `trigger_auto_ai_parsing` re-parses intake notes, `queue_insurance_card_fetch` queues card fetch, `auto_queue_confirmed_appointment` adds to EMR if Confirmed.

3. **Run script once**, capture per-row result (created / skipped / failed + reason), return a summary report in chat.

## Project → Location ID map (from CSV)

```text
Buffalo Vascular Associates           Tgwbq3sMoEBSLmJ0jGr5
Apex Vascular                         9qcQctq3qbKJfJgtB6xL
AVA Vascular                          pdt30sKeaaBubLsO1OM3
Champion Heart and Vascular Center    VUmKpmdD5cOoSIG1jOSQ
Davis Vein & Vascular                 Rhq64PurLbK4SsNZanNp
Fayette Surgical Associates           2A5UhxHUqmsuusZKU8gM
Joint & Vascular Institute            C6etkGtlZEebh0Qgedph + vqEsznRbFztYT5bEZ8RM
NG Vascular and Vein Center           mmheMRxy3nM6H9lrGuKp
Ozark Regional Vein and Artery Ctr    pzCgnwarB1NRazmiwoWN
Prospero Vascular & Interventional    0O8mFySgFECC6Jt3S6Pt
Vascular and Embolization Specialists ZhwNNKRbMYbj6sktNVYC
Vascular Solutions of North Carolina  Natyl1sRTZCGu7VXrgAz
Vascular Institute of Michigan        TNqlJFl1yDyS7eIXWtlf
Georgia Endovascular                  dyGrPEmrXkU8KSU6mDwJ
Texas Endovascular                    xsuXmHIi89R30MIMlxtM
```

## Open questions

1. **Rows 54–57 (Bernardo Estrada, Jose Carrazana, Michael Paul Strassel, Lakisha Williams)** all use location `R7WRMPd1zyAxkp8WCZZo`, with no project header above them in the CSV. Which project do these belong to?
2. **Diana Washington (row 51) + Michael Velez (row 52)** have `"Patient Pro Marketing"` in the URL column instead of a GHL link — no contact ID available. Should I (a) skip them, (b) create unscheduled shells under VSNC using only the name/phone/email, or (c) search GHL by phone within VSNC's location?
3. **Empty-URL entries** — Terri Keyes (Apex), Michael Strassel, Penny Scott, Horace Jackson, Mike Sutton, Troy Varner — only have a GHL URL but no phone/email in the CSV. The contact ID is still in the URL, so the GHL lookup will fill those fields. Confirm OK to proceed for these as-is.

## Technical notes

- Uses existing `GHL_API_KEY` secret; same auth pattern as `fetch-ghl-contact-data`.
- Edge function is one-time-use but kept in `supabase/functions/` for re-runs; safe-by-design (skips duplicates by `ghl_id`).
- No schema changes. No memory updates needed.
