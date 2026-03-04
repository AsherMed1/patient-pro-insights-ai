

## Hide Embedded OpenAI Prompts from Patient Intake Notes Display

### Problem
The `patient_intake_notes` field for some patients (e.g., Genia Lemanski at TVI) contains the full OpenAI system prompt that was embedded in the GHL form data. This prompt text is being displayed verbatim in both the `DetailedAppointmentView` and `AppointmentCard` components, exposing internal AI instructions to portal users.

### Fix
Add a sanitization function that strips out the OpenAI prompt section from intake notes before rendering. The prompt block starts with a recognizable pattern like `"OpenAI Prompt:"` or `"OpenAi Prompt:"`.

**Approach:** Create a utility function that truncates the notes at the `"OpenAI Prompt:"` marker (case-insensitive), removing everything from that point onward.

### Changes

| File | Change |
|------|--------|
| `src/components/appointments/DetailedAppointmentView.tsx` | Add a `stripAIPrompt()` helper that removes text starting from "OpenAI Prompt:" (case-insensitive). Apply it in the intake notes render block (~line 851) before `filterIntakeNotesByProcedure`. |
| `src/components/appointments/AppointmentCard.tsx` | Apply the same `stripAIPrompt()` helper where `patient_intake_notes` is rendered (~line 1636). |

### Helper function
```typescript
const stripAIPrompt = (notes: string): string => {
  const idx = notes.toLowerCase().indexOf('openai prompt:');
  if (idx === -1) return notes;
  return notes.substring(0, idx).trimEnd();
};
```

