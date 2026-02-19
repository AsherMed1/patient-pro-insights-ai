

# Fix PAD Survey Field Population

## Root Cause

Two issues prevent PAD survey data from populating correctly:

### Issue 1: Multi-Select GHL Fields Lose Data
Line 657 of `auto-parse-intake-notes/index.ts`:
```
const value = Array.isArray(field.field_value) ? field.field_value[0] : field.field_value;
```
GHL multi-select fields (like "Select the following medical conditions") return arrays (e.g., `["Hypertension", "Diabetes", "Kidney disease"]`). The code only takes the **first element**, discarding the rest. This is why DONOTCONTACT TESTLEAD's medical conditions ended up in `other_notes` via the AI instead of `diagnosis` via GHL extraction -- the GHL extraction only got "Hypertension" while the AI got the full comma-separated text from the intake notes.

### Issue 2: Missing PAD Context in AI Prompt
The AI prompt includes specific guidance for UFE, PAE, GAE, and PFE procedures but has **no PAD-specific context**. When the AI parser processes PAD intake notes, it doesn't know what PAD-specific fields to prioritize, causing it to misroute data (e.g., medical conditions going to `other_notes` instead of `diagnosis`).

## Changes

### File: `supabase/functions/auto-parse-intake-notes/index.ts`

1. **Fix array value handling (line 657)**: Join array values with ", " instead of taking only the first element:
   ```
   const value = Array.isArray(field.field_value) ? field.field_value.join(', ') : field.field_value;
   ```

2. **Add PAD context to AI prompt (around line 1245)**: Add PAD-specific guidance alongside UFE/PAE/GAE/PFE:
   ```
   ${calendarProcedure === 'PAD' ? 'PAD (Peripheral Artery Disease) focuses on: poor circulation, numbness, cold feet, discoloration, open wounds/sores, toe pain, pain that worsens when walking and improves with rest, blood thinners, smoking/tobacco status, medical conditions (diabetes, hypertension, kidney disease). Set procedure_type to "PAD". Map medical conditions to "diagnosis".' : ''}
   ```

### Deploy
Deploy the updated `auto-parse-intake-notes` edge function, then reparse the TVI PAD test appointments to verify the fields populate correctly.

