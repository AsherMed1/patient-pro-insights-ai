## Problem

The GHL link falls back to `https://services.leadconnectorhq.com/contacts/{id}` when we can't resolve a `ghl_location_id` for the case's project. That URL is a REST API endpoint (returns `401 version header was not found.`), not the GHL app UI. Only the `app.gohighlevel.com/v2/location/{loc}/contacts/detail/{id}` URL renders a usable page.

## Fix

In `src/components/admin/QAOperationsQueue.tsx`:

1. **Drop the broken fallback in `ghlUrlFor`.** Return `null` when `projectLocationMap[project_name]` is missing, so the icon simply doesn't render for unresolved projects instead of pointing to a 401 page.
2. **Broaden the location lookup** so it doesn't quietly miss projects:
   - Also select `ghl_subaccount_id` from `projects` and use it as a secondary source if `ghl_location_id` is null (mirrors the pattern already used elsewhere).
   - If a case still has no mapping after the initial fetch, one-shot fetch the project's location by name on demand (cached in the same map) — covers projects added after the component mounts.
3. **Verify the resolved URL format** matches what `AppointmentCard.tsx` uses (`https://app.gohighlevel.com/v2/location/{loc}/contacts/detail/{ghl_contact_id}`) — already correct, no change needed there.

No DB changes, no other files touched.

## Follow-up question after this fix

For QA cases whose project genuinely has no `ghl_location_id` on file, do you want me to (a) hide the icon silently, or (b) show a disabled icon with a tooltip like "No GHL location configured for this project"? Default in this plan: hide silently.