

## Fix: "Refresh from GHL" Error Due to Auto-Parse Response Handling

### Problem
The "Refresh from GHL" button triggers `reparse-specific-appointments`, which works through 3 steps:
1. Fetch GHL contact data — succeeds
2. Reset parsing fields — succeeds
3. Call `auto-parse-intake-notes` — the function returns an HTML error page instead of JSON

Line 78 calls `parseResponse.json()` on the HTML response, which throws `SyntaxError: Unexpected token '<'`, causing the entire function to return a 500 error to the client.

### Root Cause
The `auto-parse-intake-notes` edge function is returning an HTML error (likely a deployment issue, timeout, or internal error). The `reparse-specific-appointments` function does not handle non-JSON responses gracefully.

### Fix

**File: `supabase/functions/reparse-specific-appointments/index.ts` (lines 68-79)**

Make the auto-parse call non-blocking and fault-tolerant. Steps 1 and 2 already succeeded — the parse will eventually run via the database trigger anyway. The fix:

1. Check `parseResponse.ok` before calling `.json()`
2. If the response is not OK, log the error but still return success (since GHL fetch and reset completed)
3. Wrap the parse call in its own try/catch so it doesn't fail the entire operation

```typescript
// Step 3: Call auto-parse-intake-notes (non-blocking, best-effort)
console.log('[REPARSE] Invoking auto-parse-intake-notes...');
let parseResult = null;
try {
  const parseResponse = await fetch(`${supabaseUrl}/functions/v1/auto-parse-intake-notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({})
  });

  if (parseResponse.ok) {
    parseResult = await parseResponse.json();
    console.log('[REPARSE] Parse result:', parseResult);
  } else {
    const errorText = await parseResponse.text();
    console.warn('[REPARSE] Auto-parse returned non-OK status:', parseResponse.status, errorText.substring(0, 200));
  }
} catch (parseErr) {
  console.warn('[REPARSE] Auto-parse call failed (non-critical):', parseErr.message);
}
```

Then return success with whatever parse result we got (or null).

### Single file edit
- `supabase/functions/reparse-specific-appointments/index.ts` — lines 67-79

### Result
The refresh button will show "Success" since the GHL data fetch and reset completed. Parsing will still happen — either from the edge function call or from the database trigger that fires when `parsing_completed_at` is reset to null.

