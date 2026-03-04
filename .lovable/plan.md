

## Sync DOB Across All Fields When Edited at the Top

### Problem
When a user edits the DOB badge at the top of the appointment card, only the top-level `dob` column is updated. The Demographics section reads from `parsed_demographics.dob` first, and Contact Information reads from `parsed_contact_info.dob` -- both JSONB fields that remain stale after the edit.

### Fix
Update the `updateDOB` function in `src/components/AllAppointmentsManager.tsx` to also update:
1. `parsed_demographics.dob` and `parsed_demographics.age` (recalculated)
2. `parsed_contact_info.dob`

This requires reading the current JSONB values first, merging the new DOB, and writing them all back in a single update.

### Changes

| File | Change |
|------|--------|
| `src/components/AllAppointmentsManager.tsx` | In `updateDOB` (~line 1022): fetch the current `parsed_demographics` and `parsed_contact_info` JSONB for the appointment, merge in the new DOB (and calculated age), then update all three columns (`dob`, `parsed_demographics`, `parsed_contact_info`) in one `.update()` call. Also update local state to include the JSONB changes so the UI reflects immediately. |

### Implementation detail

```typescript
const updateDOB = async (appointmentId: string, dob: string | null) => {
  // 1. Fetch current JSONB fields
  const { data: current } = await supabase
    .from('all_appointments')
    .select('parsed_demographics, parsed_contact_info')
    .eq('id', appointmentId)
    .single();

  // 2. Calculate age from new DOB
  const calculateAge = (dobStr: string) => {
    const birth = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || 
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // 3. Build updated JSONB objects
  const updatedDemographics = { ...(current?.parsed_demographics || {}), dob, age: dob ? calculateAge(dob) : null };
  const updatedContact = { ...(current?.parsed_contact_info || {}), dob };

  // 4. Single update with all fields
  await supabase.from('all_appointments').update({
    dob,
    parsed_demographics: updatedDemographics,
    parsed_contact_info: updatedContact,
    updated_at: new Date().toISOString()
  }).eq('id', appointmentId);

  // 5. Update local state with all three fields
};
```

Single file change. Demographics age, Demographics DOB, and Contact DOB will all update instantly.

