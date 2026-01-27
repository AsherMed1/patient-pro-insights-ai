
## Fix Reserved Time Blocks for Round-Robin Calendars

### Problem

When creating a reserved time block on a round-robin calendar with multiple team members, the current implementation only blocks one team member's availability. The GHL API's `/block-slots` endpoint requires an `assignedUserId` for non-event calendars, but the current code only uses the **first** team member from the calendar's `teamMembers` array.

The edge function log confirms this:
```
Block slot created successfully: { assignedUserId: "Zp9EC96BkVqrUHHLCVgm", ... }
```

This blocks just one provider, leaving the other team members' slots still available for booking.

---

### Solution

Modify the edge function to iterate over **all team members** in a round-robin calendar and create a separate block slot for each one. This ensures the entire time range is unavailable across all providers.

---

### Part 1: Fetch All Team Members

**File:** `supabase/functions/create-ghl-appointment/index.ts`

Update the calendar details fetch logic to extract all team member IDs:

```typescript
const calendarDetails = await calendarDetailsResponse.json();
const teamMembers: string[] = (
  calendarDetails?.calendar?.teamMembers || []
).map((tm: any) => tm.userId || tm.id).filter(Boolean);
```

---

### Part 2: Loop and Create Block Slots for Each Team Member

Instead of creating a single block slot with one `assignedUserId`, iterate over all team members:

```typescript
const createdBlocks: string[] = [];

for (const userId of teamMembers) {
  const blockSlotByUserPayload = {
    assignedUserId: userId,
    locationId: project.ghl_location_id,
    title: title || 'Reserved',
    startTime: start_time,
    endTime: end_time,
  };

  console.log('[CREATE-GHL-BLOCK-SLOT] Creating block for team member:', userId);

  const userBlockResponse = await fetch(
    'https://services.leadconnectorhq.com/calendars/events/block-slots',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${project.ghl_api_key}`,
        'Version': '2021-04-15',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(blockSlotByUserPayload),
    }
  );

  const userBlockData = await userBlockResponse.json();

  if (userBlockResponse.ok && userBlockData.id) {
    createdBlocks.push(userBlockData.id);
  } else {
    console.warn('[CREATE-GHL-BLOCK-SLOT] Failed to block for user:', userId, userBlockData);
  }
}
```

---

### Part 3: Return Aggregated Result

Return all created block IDs in the response:

```typescript
return new Response(
  JSON.stringify({
    success: true,
    ghl_appointment_id: createdBlocks[0], // Primary ID for local DB
    all_block_ids: createdBlocks,         // All created blocks
    team_members_blocked: createdBlocks.length,
    ghl_data: { /* summary */ }
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

---

### Part 4: Handle Empty Team Members Gracefully

If no team members are found, fall back to the placeholder contact approach (which creates an actual appointment):

```typescript
if (teamMembers.length === 0) {
  console.warn('[CREATE-GHL-BLOCK-SLOT] No team members found. Falling back to placeholder contact...');
  // Existing fallback logic using appointments endpoint
}
```

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/create-ghl-appointment/index.ts` | Loop over all team members in round-robin calendars and create individual block slots for each |

---

### Expected Result

After this change:
- When you reserve 9 AM - 5 PM on a round-robin calendar with 3 team members, the system will create **3 block slots** (one per provider)
- All team members will show as unavailable for that time range in HighLevel
- The public booking widget will not offer that time slot to anyone
- The local database will store the primary block ID but know all team members were blocked

---

### Technical Note

The GHL API does not support blocking an entire round-robin calendar with a single call. Each team member must be blocked individually. This is consistent with how HighLevel's UI works when you manually block time on a round-robin calendar.
