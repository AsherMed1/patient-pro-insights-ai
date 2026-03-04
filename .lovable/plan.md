

## Update Support AI Bot Instructions for Rescheduling

### Problem
The AI support bot tells users to find an "Edit" button to change appointment date/time. That workflow is admin-only. Portal users should reschedule via the Status dropdown, which triggers GHL sync automatically.

### Fix
Update the `SYSTEM_PROMPT` in `supabase/functions/support-ai-chat/index.ts` to include explicit instructions on the correct rescheduling workflow.

**Add to the system prompt:**
- To reschedule an appointment, users should open the appointment record, click the Status dropdown, and select "Rescheduled". This will prompt them to choose a new date and time, which automatically syncs with GoHighLevel.
- Users do NOT have a direct "Edit" button for date/time — that is admin-only.
- Clarify that after rescheduling, the status automatically reverts to "Confirmed" and the appointment moves back to the "New" tab.

### Single file change
| File | Change |
|------|--------|
| `supabase/functions/support-ai-chat/index.ts` | Expand `SYSTEM_PROMPT` with rescheduling instructions and a note that direct date/time editing is admin-only. |

