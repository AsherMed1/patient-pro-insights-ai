

## Surface GHL Sync Failures to Users

### What
Show a warning toast when the GHL appointment status sync fails, instead of silently catching the error. The portal status update itself succeeds (it's already saved to the database), so this should be a **warning**, not a blocking error.

### Change

**File: `src/components/AllAppointmentsManager.tsx`, lines 823-836**

Replace the silent catch with a warning toast:

```typescript
if (syncData?.ghl_appointment_id) {
  try {
    const { error: ghlError } = await supabase.functions.invoke('update-ghl-appointment', {
      body: {
        ghl_appointment_id: syncData.ghl_appointment_id,
        project_name: syncData.project_name,
        status,
      }
    });
    if (ghlError) throw ghlError;
    console.log('✅ GHL status synced:', status);
  } catch (ghlErr) {
    console.error('⚠️ GHL status sync failed:', ghlErr);
    toast({
      title: "GHL Sync Warning",
      description: "Status saved locally but failed to sync to GoHighLevel. The appointment may need manual update in GHL.",
      variant: "destructive",
    });
  }
} else {
  // No GHL ID — warn that sync was skipped
  console.warn('⚠️ No ghl_appointment_id found, GHL sync skipped');
  toast({
    title: "GHL Sync Skipped",
    description: "No GoHighLevel appointment ID found for this record. Status was saved locally only.",
  });
}
```

### Key Details
- Also checks the `error` property from `supabase.functions.invoke()` (which returns `{ data, error }` — a non-throwing pattern), so we catch both network failures and function-level errors.
- Adds a toast when `ghl_appointment_id` is missing entirely, which was the likely cause of the George Castro issue.
- The success toast on line 854 still fires since the DB update succeeded — the warning toast appears alongside it to flag the sync gap.

### Single file edit
- `src/components/AllAppointmentsManager.tsx`

