## What else the same webhook can nuke

Reviewed the full appointment-update path (`applyUpdates` in `supabase/functions/ghl-webhook-handler/index.ts`) and the enrichment path (`enrichAppointmentWithGHLData`). Beyond the date/time bug that was just fixed, three more fields are at risk when GHL fires a "contact-only" / "notes-only" workflow that lacks appointment context:

### 1. `calendar_name` — actively broken (already damaged in DB)

Extractor defaults `calendar_name` to `"Unknown"` when the payload has no calendar block, then the update writes it unconditionally:

```ts
if (webhookData.calendar_name) {
  updateFields.calendar_name = webhookData.calendar_name   // "Unknown" wins
}
```

Verified damage:
- Kenneth Loftly (`0cd2c8e5…`) → `calendar_name = "Unknown"` (was a real GAE/PAE Atlanta calendar).
- Test Johann Booked (`bb2d7959…`) → `calendar_name = "Unknown"`.

This also breaks the procedure-detection logic that keys off calendar name (color coding, service filters, procedure inference).

### 2. `dob` — latent risk in enrichment path

In `enrichAppointmentWithGHLData` (~line 1809):

```ts
dob: contact.dateOfBirth || null,   // unconditional overwrite, may write null
```

If a future GHL contact refresh returns no `dateOfBirth`, the stored DOB gets blanked (and Age recalculates to null). Not damaged today, but a landmine.

### 3. `patient_intake_notes` — non-destructive but messy

Existing logic appends the incoming notes block when the local notes don't contain `**Contact:**`. Contact-only webhooks CAN and DO carry a `**Contact:**` block, so this normally short-circuits. Safe for now; leave alone.

Everything else (`status`, `lead_email`, `lead_phone_number`, `insurance_id_link`, `was_ever_confirmed`, `ghl_location_id`) is already guarded (truthy-only or empty-only writes).

## Fix

Edit `supabase/functions/ghl-webhook-handler/index.ts`:

1. **calendar_name guard** (~line 1166): only overwrite when incoming is truthy AND not the literal `"Unknown"`.
   ```ts
   if (webhookData.calendar_name && webhookData.calendar_name !== 'Unknown') {
     updateFields.calendar_name = webhookData.calendar_name
   }
   ```

2. **dob guard in enrichment** (~line 1809): only include `dob` in the update when `contact.dateOfBirth` is truthy.
   ```ts
   ...(contact.dateOfBirth ? { dob: contact.dateOfBirth } : {}),
   ```
   Same protection for `parsed_demographics.dob` / `age` — only recompute when we actually have a DOB.

3. **Data repair** — clear the two rows already stamped with `"Unknown"`:
   ```sql
   UPDATE all_appointments SET calendar_name = NULL, updated_at = now()
   WHERE id IN ('0cd2c8e5-7d69-4db1-84e1-023162b5edb7',
                'bb2d7959-68b1-475e-b8f9-de765b113c51')
     AND calendar_name = 'Unknown';
   ```
   Setting to NULL is safer than guessing (Kenneth's original calendar isn't recoverable from history). The next real GHL appointment webhook or a portal admin edit will refill it.

## Validation

1. Deploy the edge function.
2. Re-fire the GHL "Sync Contact Notes → Portal" workflow on a test contact — confirm `calendar_name`, `date_of_appointment`, and `requested_time` are all unchanged and no bogus reschedule note appears.
3. Trigger a real GHL appointment create/update — confirm the calendar name, date, and DOB still flow through normally.
4. Spot-check Kenneth Loftly and Test Johann Booked in the portal: date/time restored (already done), calendar_name blanked (ready for a real value on next legitimate webhook).
