## Change

In `src/components/admin/QAOperationsQueue.tsx`, replace the current `TECH_ASSIGNEES = VA_ASSIGNEES` alias with a dedicated tech team list:

- Luis De Leon
- Alexa Briggs
- Althea Romero
- Johann Paul Alpapara
- Mohsin

The ticket-creation dialog already switches between `TECH_ASSIGNEES` and `VA_ASSIGNEES` based on `ticketForm.issue_type`, so once the constant is separated the Tech Ticket assignee picker will show only the tech team, matching ControlHub's tech ticket flow. VA Ticket assignees remain unchanged.

No other logic, schema, or edge-function change needed.