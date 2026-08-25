# Push `do-not-reschedule` tag to GHL when Recapture "Not Interested" is selected

## Current behavior
Selecting **Not Interested** in the Recapture drawer (`RecaptureCaseDrawer.tsx` lines 292–300) completes the case and inserts a `patient_reschedule_blocks` row, but it never touches GHL. No tag is pushed today.

## Change
When `conversationOutcome === 'not_interested'` and the case update succeeds, push the single `do-not-reschedule` tag to the GHL contact via the existing `update-ghl-contact-tags` edge function. One tag, no cleanup of other tags, no other outcomes affected.

Implementation in `src/components/recapture/RecaptureCaseDrawer.tsx` inside `persist()`, right after the existing `blockFutureOutreach(...)` call for the not-interested branch:

```ts
// Push do-not-reschedule tag to GHL so workflows halt outreach.
if (row.appointment_id && payload.conversationOutcome === 'not_interested') {
  const { data: appt } = await supabase
    .from('all_appointments')
    .select('ghl_id, project_name')
    .eq('id', row.appointment_id)
    .maybeSingle();
  if (appt?.ghl_id) {
    const { data: proj } = await supabase
      .from('projects')
      .select('ghl_api_key')
      .eq('project_name', appt.project_name)
      .maybeSingle();
    supabase.functions.invoke('update-ghl-contact-tags', {
      body: {
        ghl_contact_id: appt.ghl_id,
        ghl_api_key: proj?.ghl_api_key || undefined,
        tags: ['do-not-reschedule'],
        action: 'add',
        source: 'recapture not-interested',
      },
    }).catch((e) => console.warn('[recapture] do-not-reschedule tag push failed', e));
  }
}
```

Fire-and-forget (`.catch`), non-blocking — the recapture save must not fail if GHL is unavailable. No audit note is required beyond the internal attempt note the drawer already writes.

## Files touched
- `src/components/recapture/RecaptureCaseDrawer.tsx` — add the tag push in the not-interested branch only.

## No changes
- No schema change, no edge function change (`update-ghl-contact-tags` already exists and resolves the project API key).
- Wrong Number, Rescheduled/Booked, and all non-terminal outcomes remain unchanged — only Not Interested pushes the tag, per your instruction.
