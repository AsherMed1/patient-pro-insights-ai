

## Add FSE (Frozen Shoulder Embolization) to Auto-Parse Intake Notes

### Problem
FSE is not recognized as a procedure type anywhere in the `auto-parse-intake-notes` edge function. When an FSE appointment comes in, the parser doesn't detect the procedure, doesn't provide FSE-specific AI context, and doesn't properly filter/extract pathology fields — resulting in empty Patient Pro Insights.

### Changes

**File: `supabase/functions/auto-parse-intake-notes/index.ts`** — 4 locations:

1. **`detectProcedureFromCalendar()`** (~line 1079): Add FSE detection
   ```typescript
   if (name.includes('fse') || name.includes('frozen shoulder')) {
     return 'FSE';
   }
   ```

2. **`detectProcedureFromFieldKey()`** (~line 674): Add FSE detection
   ```typescript
   if (upperKey.includes('FSE') || upperKey.includes('FROZEN SHOULDER') || upperKey.includes('SHOULDER')) {
     return 'FSE';
   }
   ```

3. **`fallbackRegexParsing()`** procedure detection (~line 474): Add FSE
   ```typescript
   } else if (upperNotes.includes('FSE') || upperNotes.includes('FROZEN SHOULDER') || upperNotes.includes('SHOULDER')) {
     result.pathology_info.procedure_type = 'FSE';
   }
   ```

4. **AI prompt procedure context** (~line 1345): Add FSE-specific guidance
   ```typescript
   ${calendarProcedure === 'FSE' ? 'FSE (Frozen Shoulder Embolization) focuses on: shoulder pain, frozen shoulder, limited range of motion, shoulder stiffness, difficulty raising arm, affected shoulder (left/right). Set procedure_type to "FSE".' : ''}
   ```

5. **Pathology field detection** (~line 754-758): Add `fse` and `shoulder` to the `isPathologyField` check so FSE STEP fields are recognized.

After deploying, re-trigger parsing for the affected Joint & Vascular Institute FSE appointments.

