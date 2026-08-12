# Add "Escalated to ES Team" Escalation Type

Adds a fifth escalation route for the Engagement Specialist (Setter) department so QA errors can be sent to the right team.

## What changes

- The Escalation Type dropdown in the QA Operations audit panel gains **Escalated to ES Team**, listed after "Escalated to AM".
- It behaves like the other "Escalated to ..." options: selecting it puts the case in the Pending / Escalated bucket, enables the Escalation Status dropdown, and includes the case in the Escalation Worklist and QA reports.
- No default owner is auto-assigned for this option (same as Tech/AM); the case can be assigned manually. If you want it to auto-assign to a specific person, tell me the email and I'll wire it in.

## Technical details

- Database: the `qa_cases.resolution_type` check constraint currently allows only `Resolved by QA`, `Escalated to Tech`, `Escalated to AM`, `Escalated to Gloria`, `Other`. A migration replaces it with the same list plus `Escalated to ES Team`.
- `src/lib/qaEscalation.ts`: add `'Escalated to ES Team'` to `ESCALATION_TYPES`. Existing `isEscalationType` (prefix check on "Escalated to") and status-sync logic pick it up automatically.
- No component edits needed — the dropdowns render from `ESCALATION_TYPES`.
