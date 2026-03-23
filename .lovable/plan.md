

## Fix: Sync Phone Number from GHL Contact Data to `lead_phone_number`

### Problem
Jerry Hannah's phone number is missing because:
1. At webhook time, `contact.phone` was null — so `lead_phone_number` was set to null (line 410)
2. The enrichment function (`enrichAppointmentWithGHLData`, line 1172) updates `parsed_contact_info.phone` but does **not** update the top-level `lead_phone_number` column
3. The `fetch-ghl-contact-data` function (Refresh from GHL) also does not update `lead_phone_number`

The phone exists in GHL (the user confirms it), but the enrichment and refresh flows never sync it to the column the UI reads from.

### Fix (2 edge functions)

**1. `supabase/functions/ghl-webhook-handler/index.ts` — `enrichAppointmentWithGHLData` (~line 1174)**

Add `lead_phone_number` and `lead_email` to the update payload so enrichment backfills missing contact fields:

```typescript
.update({ 
  patient_intake_notes: updatedNotes,
  parsed_contact_info: parsedContactInfo,
  parsed_demographics: parsedDemographics,
  dob: contact.dateOfBirth || null,
  lead_phone_number: contact.phone || undefined,  // backfill if available
  lead_email: contact.email || undefined,          // backfill if available
  updated_at: new Date().toISOString()
})
```

Use conditional inclusion: only set `lead_phone_number` if `contact.phone` is truthy, to avoid overwriting existing values with null.

**2. `supabase/functions/fetch-ghl-contact-data/index.ts` (~line 264)**

Add `lead_phone_number` to the update payload so "Refresh from GHL" also syncs the phone:

```typescript
.update({ 
  patient_intake_notes: updatedNotes,
  lead_phone_number: contact.phone || undefined,
  lead_email: contact.email || undefined,
  updated_at: new Date().toISOString()
})
```

### Files to Edit
- `supabase/functions/ghl-webhook-handler/index.ts` — enrichment update (~line 1174)
- `supabase/functions/fetch-ghl-contact-data/index.ts` — refresh update (~line 266)

Both functions need redeployment. After deployment, clicking "Refresh from GHL" on Jerry Hannah's card will populate the phone number.

