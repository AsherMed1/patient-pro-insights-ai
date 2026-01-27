
# Plan: Fix Reserved Time Blocks to Show as Blocked Slots (Not Appointments)

## Problem Summary

Two issues need to be addressed:

1. **GHL shows reserved blocks as green "Appointments" instead of greyed-out "Blocked Slots"**
   - The current edge function creates placeholder appointments instead of true block slots
   - For round-robin calendars, the block-slots API requires `assignedUserId` (not `calendarId`)

2. **Reserved blocks are counted in appointment statistics**
   - The Project Portal stats query doesn't exclude `is_reserved_block = true` records
   - This inflates the "Total Appointments" count on dashboard cards

---

## Solution Overview

### Part 1: Fix GHL API to Create True Block Slots

The `/calendars/events/block-slots` endpoint documentation states:
> "Either calendarId or assignedUserId can be set, not both."

For round-robin calendars, we need to:
1. First fetch the calendar details to get `teamMembers`
2. Use `assignedUserId` (from team member) instead of `calendarId` when calling block-slots
3. Create one block slot per team member to fully block the calendar

### Part 2: Exclude Reserved Blocks from Statistics

Add filter to exclude reserved blocks from appointment counts on the Project Portal.

---

## Technical Changes

### 1. Edge Function: `supabase/functions/create-ghl-appointment/index.ts`

**Current Flow:**
```text
1. Try block-slots with calendarId
2. If fails -> Create placeholder appointment
```

**New Flow:**
```text
1. Fetch calendar details to determine type and team members
2. For EVENT calendars: Use block-slots with calendarId (existing logic)
3. For ROUND-ROBIN calendars: 
   a. Get all team members from calendar
   b. For each team member, call block-slots with assignedUserId (not calendarId)
   c. This creates actual blocked slots (greyed out) for each team member
4. If block-slots fails entirely (API limitation), fall back to local-only record
   with ghl_synced: false flag
```

**Key Code Changes:**
- Remove the placeholder contact creation logic
- Remove the appointment-based fallback
- Add logic to iterate over team members and create block slots per user
- Use `assignedUserId` parameter for round-robin calendars
- Return success even if GHL sync fails (allow local tracking)

### 2. Frontend Stats Query: `src/pages/ProjectPortal.tsx`

**Function:** `fetchAppointmentStats`

**Change:** Add filter to exclude reserved blocks:
```typescript
query = query.or('is_reserved_block.is.null,is_reserved_block.eq.false');
```

This matches the existing pattern used in `AllAppointmentsManager.tsx`.

### 3. Other Stats Locations to Update

Check and update these files if they query appointment counts:
- `src/components/ProjectsManager.tsx` - Project card stats
- `src/hooks/useMasterDatabase.tsx` - Master database stats

---

## Implementation Details

### Edge Function Changes

```text
supabase/functions/create-ghl-appointment/index.ts:

1. Remove placeholder contact creation (lines ~237-304)
2. Remove appointment-based fallback (lines ~306-445)
3. Add new logic after block-slots fails:

   For round-robin calendars:
   - Extract teamMembers from calendar data
   - For each teamMember:
     - Call block-slots with:
       - assignedUserId: teamMember.userId
       - NO calendarId (mutually exclusive)
       - locationId, title, startTime, endTime
   - Track all created block IDs
   - Return success with list of blocked team members

4. Graceful degradation:
   - If all block-slots calls fail, return success with ghl_synced: false
   - Allow local record creation without GHL sync
   - Log warning for admin review
```

### Stats Query Changes

```text
src/pages/ProjectPortal.tsx (fetchAppointmentStats):
  Add: .or('is_reserved_block.is.null,is_reserved_block.eq.false')

src/components/ProjectsManager.tsx (fetchProjectStats):
  Add: .or('is_reserved_block.is.null,is_reserved_block.eq.false')

src/hooks/useMasterDatabase.tsx (fetchStats):
  Add: .or('is_reserved_block.is.null,is_reserved_block.eq.false')
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/create-ghl-appointment/index.ts` | Use assignedUserId for block-slots on round-robin calendars, remove appointment fallback |
| `src/pages/ProjectPortal.tsx` | Filter out is_reserved_block from stats query |
| `src/components/ProjectsManager.tsx` | Filter out is_reserved_block from stats query |
| `src/hooks/useMasterDatabase.tsx` | Filter out is_reserved_block from stats query |

---

## Expected Outcome

After implementation:
1. Reserved time blocks will appear as **greyed-out "Blocked Slots"** in GHL (not green appointments)
2. Reserved blocks will **not inflate** the "Total Appointments" count on dashboard cards
3. The calendar in the portal will continue showing reserved blocks with distinct styling
4. If GHL sync fails, local tracking still works (graceful degradation)
