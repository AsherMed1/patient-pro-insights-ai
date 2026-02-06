

# Plan: Fix Reserved Time Block Creation for Project Users

## Problem Summary

The "Failed to Reserve Time" error persists because:

1. **GHL Block Creation Succeeds** - The edge function `create-ghl-appointment` uses the service role key and successfully creates blocks in GoHighLevel (confirmed by logs showing `successCount: 1`)

2. **Local Database Insert Fails** - The frontend then tries to insert into `all_appointments` using the authenticated Supabase client, which is subject to Row Level Security (RLS)

3. **Missing INSERT Policy** - Project users have SELECT, UPDATE, and DELETE policies but **no INSERT policy** for `all_appointments`. Only admins and agents can insert.

This explains why the error persists despite the previous fix - the audit note handling was improved, but the core database insert is being blocked by RLS.

---

## Root Cause

| Policy | Admins | Agents | Project Users |
|--------|--------|--------|---------------|
| SELECT | Yes | Yes | Yes |
| INSERT | Yes | Yes | **NO** |
| UPDATE | Yes | Yes | Yes |
| DELETE | Yes | Yes | Yes |

The Ozark user is likely a `project_user` role, not an admin or agent.

---

## Solution

Move the entire reservation flow (GHL + local database insert) to the edge function so it can use the service role key to bypass RLS. This is the correct pattern because:

1. Edge functions with service role key bypass RLS
2. All critical operations happen atomically in one server-side function
3. If GHL succeeds but DB fails, we can attempt rollback (delete the GHL block)
4. User preferences indicated "Rollback on DB failure" behavior

---

## Technical Implementation

### Step 1: Refactor `create-ghl-appointment` Edge Function

**File: `supabase/functions/create-ghl-appointment/index.ts`**

Extend the edge function to also handle the local database insert:

**Current flow:**
1. Create block in GHL
2. Return success with GHL appointment ID
3. (Frontend then tries to insert local record - fails due to RLS)

**New flow:**
1. Create block in GHL
2. Insert local record in `all_appointments` using service role
3. If local insert fails, attempt to delete the GHL block (rollback)
4. Insert audit note (non-critical, wrapped in try/catch)
5. Return comprehensive result including local appointment ID

**New request parameters:**
```typescript
interface CreateBlockSlotRequest {
  project_name: string;
  calendar_id: string;
  start_time: string;
  end_time: string;
  title?: string;
  reason?: string;
  // NEW: for local record creation
  calendar_name?: string;
  user_name?: string;
  user_id?: string;
  create_local_record?: boolean;  // Flag to enable local insert
}
```

**New response:**
```typescript
{
  success: true,
  ghl_appointment_id: "...",
  local_appointment_id: "...",  // NEW
  ghl_synced: true,
  local_saved: true,  // NEW
  // ... existing fields
}
```

### Step 2: Update Frontend Dialog

**File: `src/components/appointments/ReserveTimeBlockDialog.tsx`**

Simplify the frontend to delegate all database operations to the edge function:

**Current handleSubmit flow:**
1. Call edge function `create-ghl-appointment`
2. Insert into `all_appointments` (fails due to RLS for project users)
3. Insert audit note

**New handleSubmit flow:**
1. Call edge function `create-ghl-appointment` with additional parameters
2. Edge function handles GHL creation, local insert, and audit note
3. Frontend only shows toast based on response

```typescript
const { data: ghlResult, error: ghlError } = await supabase.functions.invoke(
  'create-ghl-appointment',
  {
    body: {
      project_name: projectName,
      calendar_id: calendarId,
      start_time: startTimeForGhl,
      end_time: endTimeForGhl,
      title,
      reason,
      // NEW parameters
      calendar_name: calendarName,
      user_name: userName || 'Portal User',
      user_id: userId,
      create_local_record: true,
    },
  }
);

// Check result - edge function now handles everything
if (ghlError || !ghlResult?.success) {
  throw new Error(ghlResult?.error || ghlError?.message || 'Failed to create reservation');
}

// Track success - both GHL and local are now handled by edge function
allCreatedAppointments.push({ 
  calendarId, 
  calendarName, 
  range, 
  ghlResult,
  localAppointmentId: ghlResult.local_appointment_id 
});
```

---

## Edge Function Changes (Detailed)

### New Insert Logic

Add after successful GHL block creation:

```typescript
// If requested, create local record in all_appointments
if (create_local_record && calendar_name) {
  try {
    const localRecord = {
      project_name,
      lead_name: title || 'Reserved',
      date_of_appointment: start_time.split('T')[0],
      requested_time: start_time.substring(11, 16),
      reserved_end_time: end_time.substring(11, 16),
      calendar_name,
      status: 'Confirmed',
      is_reserved_block: true,
      internal_process_complete: true,
      ghl_appointment_id: ghlAppointmentId,
      ghl_location_id: project.ghl_location_id,
      date_appointment_created: new Date().toISOString().split('T')[0],
      patient_intake_notes: `Time block reserved by ${user_name} on ${new Date().toLocaleDateString()}\nReason: ${reason || 'Not specified'}\nCalendar: ${calendar_name}`,
    };

    const { data: newAppt, error: insertError } = await supabase
      .from('all_appointments')
      .insert(localRecord)
      .select()
      .single();

    if (insertError) {
      console.error('[CREATE-GHL-BLOCK-SLOT] Local insert failed, attempting rollback:', insertError);
      
      // Rollback: delete the GHL block
      await deleteGhlBlock(ghlAppointmentId, project.ghl_api_key);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to save reservation locally. GHL block was rolled back.',
          rollback_performed: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create audit note (non-critical)
    if (user_id) {
      try {
        await supabase.from('appointment_notes').insert({
          appointment_id: newAppt.id,
          note_text: `Reserved time block created by ${user_name}. Reason: ${reason || 'Not specified'}. Calendar: ${calendar_name}.`,
          created_by: user_id,
        });
      } catch (noteErr) {
        console.warn('[CREATE-GHL-BLOCK-SLOT] Audit note failed (non-critical):', noteErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ghl_appointment_id: ghlAppointmentId,
        local_appointment_id: newAppt.id,
        ghl_synced: true,
        local_saved: true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Unexpected error in local save:', err);
    // Attempt rollback
    await deleteGhlBlock(ghlAppointmentId, project.ghl_api_key);
    throw err;
  }
}
```

### Rollback Helper Function

```typescript
async function deleteGhlBlock(eventId: string, apiKey: string): Promise<void> {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/calendars/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // GHL requires empty body for DELETE
      }
    );
    console.log('[CREATE-GHL-BLOCK-SLOT] Rollback result:', response.status);
  } catch (err) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Rollback failed:', err);
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/create-ghl-appointment/index.ts` | Add local record creation, rollback logic, audit note |
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | Remove local insert code, pass additional params to edge function |

---

## Testing

After implementation:
1. Log in as an Ozark project user
2. Attempt to reserve a time block (e.g., 3:00 PM - 3:30 PM)
3. Verify:
   - Success toast appears
   - Block appears in calendar view
   - Block appears in GoHighLevel
   - Audit note is created in appointment notes
4. Test rollback: Temporarily break local insert to verify GHL block is deleted on failure

---

## Summary

This fix addresses the root cause by moving all database operations to the edge function, which uses the service role key and bypasses RLS restrictions. The frontend becomes a simple orchestrator that calls the edge function and displays results. This pattern is more secure, more reliable, and eliminates the RLS-related failures that project users are experiencing.

