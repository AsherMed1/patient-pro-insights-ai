

## Sync Header Field Updates to Contact Information Section

### Problem
When editing email (or phone/name) from the header area, only the top-level column (`lead_email`) is updated. The `parsed_contact_info` JSONB field is not updated, so the Contact Information section in Patient Pro Insights continues showing the old value. Same issue applies to phone and name updates.

### Changes

| File | Change |
|------|--------|
| `src/components/AllAppointmentsManager.tsx` | In `updateAppointmentEmail`, also update `parsed_contact_info.email` in the DB and call `fetchAppointments()` after success. Apply the same pattern to `updateAppointmentPhone` (sync `parsed_contact_info.phone`) and `updateAppointmentName` (sync `parsed_contact_info.name`). |

### Detail

For each of the three update functions, the DB update needs to merge the new value into the existing `parsed_contact_info` JSONB, then call `fetchAppointments()` to refresh the UI fully.

**updateAppointmentEmail** (lines 1195-1227):
```typescript
const updateAppointmentEmail = async (appointmentId: string, email: string) => {
  try {
    const appointment = appointments.find(a => a.id === appointmentId);
    const updatedContactInfo = {
      ...(appointment?.parsed_contact_info || {}),
      email
    };
    
    const { error } = await supabase
      .from('all_appointments')
      .update({
        lead_email: email,
        parsed_contact_info: updatedContactInfo,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (error) throw error;
    toast({ title: "Success", description: "Email updated" });
    fetchAppointments();
    fetchTabCounts();
    onDataChanged?.();
  } catch ...
};
```

Apply the same pattern to `updateAppointmentPhone` (sync `parsed_contact_info.phone`) and `updateAppointmentName` (sync `parsed_contact_info.name`).

Single file, three function updates.

