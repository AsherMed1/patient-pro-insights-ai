

# Fix: Notes Not Showing for New Lead "VES TEST ONLY"

## Investigation Findings

After checking the database, the appointment record for "VES TEST ONLY" (ID: `9eb68541`) exists in the `all_appointments` table. However, the text "I have pain when i sit on the toilet and i bleed a lot" is **not present anywhere in the stored data**.

The GHL data that was captured includes:
- Contact info (name, phone, email, DOB, address)
- Insurance info (Medicare, ID number, card upload)
- HAE pathology step questions (pain level 7, symptoms, treatments)
- PCP info (Dr who)

But no free-text "Notes" field was captured from GHL with the hemorrhoid complaint text.

## Root Cause

The GHL contact likely has a "Notes" custom field (or similar) containing "I have pain when i sit on the toilet and i bleed a lot", but it was either:
1. Not present at the time the webhook fired and GHL data was fetched
2. Named in a way that gets filtered out (e.g., "Conversation Notes" is explicitly skipped by the webhook handler)
3. Added to the GHL contact after the initial data sync

## Proposed Fix

**Re-fetch GHL data** for this contact to pull the latest custom fields, which should now include the notes. This can be done by clicking the "Fetch GHL Data" button on the appointment detail view, which calls the `fetch-ghl-contact-data` edge function.

If the notes still don't appear after re-fetching, it means the GHL custom field name doesn't match any of the routing patterns. In that case, I would need to:

1. Check the edge function logs to see what custom fields are returned from GHL for this contact
2. Update the field routing logic in both the `ghl-webhook-handler` and `fetch-ghl-contact-data` functions to capture the specific field name used for HAE notes

## Recommended Next Step

Before making code changes, try clicking "Fetch GHL Data" on the VES TEST ONLY appointment to re-sync from GHL. If notes still don't appear, I can check the edge function logs to identify the exact field name being used and add routing for it.

