

## Fix: OON Still Being Overwritten via `update-appointment-status` API

### Root Cause
When a patient is marked OON:
1. Portal updates DB to "OON"
2. Portal fires `appointment-status-webhook` to a GHL workflow URL
3. Portal sends "cancelled" to GHL via `update-ghl-appointment`
4. The GHL workflow (from step 2) calls back to `update-appointment-status` with status "Cancelled"
5. `update-appointment-status` has **no portal-only terminal status guard** — it overwrites "OON" with "Cancelled"

The `ghl-webhook-handler` guard we added earlier is working correctly, but this is a different code path.

### Fix
Add a portal-only terminal status guard to `update-appointment-status/index.ts`. Before applying a status update, fetch the existing record and skip the status change if it's already "OON" or "Do Not Call".

**File: `supabase/functions/update-appointment-status/index.ts`** (~line 135-140)

After building the identifier query but before executing the update, check if the existing status is a portal-only terminal status. If so, strip the `status` field from `updateData` to preserve it.

```typescript
// Guard: Don't overwrite portal-only terminal statuses (OON, Do Not Call)
if (updateData.status) {
  // Fetch existing record to check current status
  let checkQuery = supabase.from('all_appointments').select('status');
  // (apply same identifier filters)
  const { data: existing } = await checkQuery.single();
  const existingStatus = existing?.status?.toLowerCase()?.trim();
  const portalOnlyStatuses = ['oon', 'do not call'];
  if (portalOnlyStatuses.includes(existingStatus)) {
    console.log(`Preserving portal-only terminal status "${existing.status}" — ignoring incoming "${updateData.status}"`);
    delete updateData.status;
  }
}
```

One file, one edge function redeployment.

