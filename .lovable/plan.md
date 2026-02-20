
# Fix: `await` Inside Non-Async Function Crashing the Webhook

## Root Cause

Lines 616–636 of `supabase/functions/ghl-webhook-handler/index.ts` contain:

```typescript
try {
  await supabase   // ← THIS IS THE PROBLEM
    .from('appointment_notes')
    .insert({ ... })
} catch (noteErr) { ... }
```

This `await` call lives inside `getUpdateableFields()`, which is declared as a plain synchronous function:

```typescript
function getUpdateableFields(
  webhookData: any,
  existingAppointment: any | null
): Record<string, any> {   // ← NOT async
```

JavaScript/TypeScript does not allow `await` in a non-async function. Deno's edge runtime catches this at **parse time**, so the function fails to boot entirely. Every incoming webhook gets a 500 error before any logic even runs — which is why GHL keeps retrying.

## The Fix

Move the `appointment_notes` insert **out of** `getUpdateableFields` and into the `async` main handler (`serve(async (req) => {...})`), where `await` is valid.

The approach:
1. `getUpdateableFields` returns the reschedule metadata as a side-channel alongside `updateFields`
2. The async caller (already at the top of the file) performs the actual insert after a successful DB update

### Step 1 — Change `getUpdateableFields` return type

Instead of returning just `Record<string, any>`, return an object with two keys:

```typescript
function getUpdateableFields(...): { 
  fields: Record<string, any>; 
  rescheduleNote?: { fromDateTime: string; toDateTime: string; appointmentId: string } 
}
```

### Step 2 — Inside the date-change block (line 615-636), remove the try/catch await entirely

Replace it with capturing the note data:

```typescript
// Before (BROKEN - await in sync function):
try {
  await supabase.from('appointment_notes').insert({ ... })
} catch (noteErr) { ... }

// After (CORRECT - just capture the data):
rescheduleNoteData = {
  fromDateTime: fromDateTime || 'Unknown',
  toDateTime,
  appointmentId: existingAppointment.id
};
```

### Step 3 — Return both from the function

```typescript
return { fields: updateFields, rescheduleNote: rescheduleNoteData };
```

### Step 4 — Update the caller (line 150) to destructure and await the note insert

```typescript
// Before:
const appointmentData = getUpdateableFields(webhookData, existingAppointment)

// After:
const { fields: appointmentData, rescheduleNote } = getUpdateableFields(webhookData, existingAppointment)
```

Then after the successful DB update (around line 190), insert the note:

```typescript
// After appointment upsert succeeds:
if (rescheduleNote) {
  try {
    await supabase.from('appointment_notes').insert({
      appointment_id: rescheduleNote.appointmentId,
      note_text: `Rescheduled | FROM: ${rescheduleNote.fromDateTime} | TO: ${rescheduleNote.toDateTime} | By: GoHighLevel`,
      created_by: 'GoHighLevel',
    });
    console.log(`[${requestId}] GHL reschedule audit note created`);
  } catch (noteErr) {
    console.error(`[${requestId}] Failed to create GHL reschedule audit note:`, noteErr);
  }
}
```

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/ghl-webhook-handler/index.ts` | Remove `await` from sync `getUpdateableFields`; return reschedule metadata; insert note in async handler |

The function will be redeployed immediately after the fix. This restores the webhook to a working state and preserves the reschedule audit trail feature.
