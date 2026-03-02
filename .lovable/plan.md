

## Fix: OON Status Not Syncing to GHL

### Root Cause

The GHL sync at line 789 of `AllAppointmentsManager.tsx` depends on `currentAppointment?.ghl_appointment_id`, where `currentAppointment` is looked up from the local `appointments` state array (line 646). If the appointment isn't in the currently loaded page of results (e.g., it was on a different page, or the status update was triggered from a search/calendar context), `currentAppointment` is `undefined` and the GHL sync is silently skipped.

For Dale Olker, the appointment has `ghl_appointment_id: HjLTcS0YrTr3mBlstWUy` in the database, but `last_ghl_sync_status` is null — confirming the `update-ghl-appointment` function was never called.

### Fix

| File | Change |
|------|--------|
| `src/components/AllAppointmentsManager.tsx` | When `currentAppointment` is not found in local state, fetch the appointment directly from the database before attempting GHL sync. This ensures the `ghl_appointment_id` and `project_name` are always available. |

### Detail

Replace the GHL sync block (lines ~788-802) with a fallback fetch:

```typescript
// Sync status to GoHighLevel
if (oldStatus !== status) {
  // Ensure we have the appointment data (may not be in local state)
  let syncData = currentAppointment;
  if (!syncData?.ghl_appointment_id) {
    const { data } = await supabase
      .from('all_appointments')
      .select('ghl_appointment_id, project_name')
      .eq('id', appointmentId)
      .single();
    syncData = data;
  }

  if (syncData?.ghl_appointment_id) {
    try {
      await supabase.functions.invoke('update-ghl-appointment', {
        body: {
          ghl_appointment_id: syncData.ghl_appointment_id,
          project_name: syncData.project_name,
          status,
        }
      });
    } catch (ghlErr) {
      console.error('⚠️ GHL status sync failed:', ghlErr);
    }
  }
}
```

This same fallback pattern should also be applied to the OON Slack notification block (line ~747) and Do Not Call DND block (line ~709), which similarly depend on `currentAppointment` or `appointments.find()`.

### Immediate Fix for Dale Olker

After deploying the code fix, we can manually trigger the GHL sync for Dale Olker by calling the `update-ghl-appointment` edge function with his `ghl_appointment_id`.

