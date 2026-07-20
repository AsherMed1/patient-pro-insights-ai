
## Correction

You're right — I mis-read your prior instruction. The correct signature for "Sarella-like" Davis rows is:

- `time_preference` IS set (e.g. `no_preference`)
- `date_of_appointment` IS NULL
- `is_unscheduled = true`
- `ghl_id` is present

...i.e. rows that currently look unscheduled in the portal but likely have a real scheduled appointment in GHL.

## Candidates confirmed in DB

Query results for the 8 names you gave (Davis Vein & Vascular, not superseded):

| Lead | portal id | ghl_id | Portal status | time_pref | date | Notes |
|---|---|---|---|---|---|---|
| Adam Neely | adeb6410 | 1NPbxBiSf4Jv6RrxC50a | Confirmed | no_preference | NULL | |
| Charles Spivey | 1f4d2e61 | WEQ1wOXfgAetOq2ySDUU | Pending | no_preference | NULL | |
| Charvis Dorismond | ffb82845 | umWANhk8iUAprGa8iBv2 | Pending | no_preference | NULL | |
| Daniel Medellin | 77252c41 | GkjVU580Rch95TbWTtbm | Pending | no_preference | NULL | |
| ESIQUIA C DELAGARZA | 99db03d4 | g70TeWQwrk8Xs6yoSJou | Pending | no_preference | NULL | |
| Fred T Gibson | 331ce51f | YQMYcpSuBuxhd2eV04Dj | Pending | no_preference | NULL | |
| Gaylord McKenzie | 9a7b7d6a | bHIcszih0rLHOMiAhoEM | Confirmed | no_preference | NULL | primary (calendar: "Request your GAE Consultation at Spring, TX") |
| Gaylord McKenzie | 89de9c8f | bHIcszih0rLHOMiAhoEM | Confirmed | no_preference | NULL | duplicate (calendar: Unknown) — same ghl_id |
| Timothy Roth | 4eefd1f2 | c0bTfgwx5Io35MpY5J7s | Confirmed | no_preference | NULL | |

None are terminal. All 9 rows are safe to repair the same way I did for Sarella. Gaylord has a duplicate that needs to be superseded.

## Plan

**Step 1 — Fetch real appointments from GHL (per contact)**

Call `backfill-ghl-appointment` once with all 8 unique `ghl_id`s under `projectName = "Davis Vein & Vascular"`. It fetches each contact's live appointments from GHL, synthesizes an `AppointmentCreate` webhook, and posts it to `ghl-webhook-handler`. With the current handler behavior, if the GHL payload carries a real `startTime`, the update branch will populate `date_of_appointment` / `requested_time` / `ghl_appointment_id` / `calendar_name` and flip `is_unscheduled = false` on the matching row (matched by `ghl_id`). No schema or code changes needed — the pipeline built for Sarella already handles this.

**Step 2 — Manual repair for anything the webhook can't map**

After Step 1, re-run the same query and inspect each row:
- If `date_of_appointment` is now populated → done.
- If GHL returned no scheduled appointment for that contact → leave the row as-is (it really is unscheduled).
- If GHL returned an appointment but the row didn't update (e.g., handler skipped it because of a guard), run a targeted `UPDATE` on `all_appointments` for that `id` with the values from `backfill-ghl-appointment`'s response.

**Step 3 — Gaylord McKenzie duplicate**

Two rows share `ghl_id = bHIcszih0rLHOMiAhoEM`. Keep the primary (`9a7b7d6a…`, calendar "Request your GAE Consultation at Spring, TX"). Mark the other (`89de9c8f…`, calendar "Unknown") as `is_superseded = true`.

**Step 4 — Report back**

Post a per-lead summary in chat:
- Real GHL appointment start time (if any) and status
- Whether the portal row was auto-repaired, needs manual patch, or was left as-is

## Out of scope

- No changes to `ghl-webhook-handler`, hybrid Davis logic, or any UI code.
- Not touching Premier / ECCO / Horizon rows.
- Not modifying the earlier 5 Cancelled-with-no-time-preference rows (separate audit if you want).
