## Fix: Merge Duplicate "Naadi Healthcare" into "Naadi Healthcare Manteca"

### Problem

The call sync created a second project called "Naadi Healthcare" (Feb 24) with 3 call records. The canonical project is "Naadi Healthcare Manteca" (Jun 1, 2025) which has all 1,605 calls, 221 appointments, and 1,081 leads plus valid GHL credentials.

### Steps

1. **Migrate the 3 orphaned calls** from `Naadi Healthcare` to `Naadi Healthcare Manteca` in the `all_calls` table
2. **Delete the duplicate project** `Naadi Healthcare` from the `projects` table  
  
3. all appointment will go to `Naadi Healthcare Manteca`

This is a data-only fix -- no code changes needed. A single SQL migration will handle it.


| Action | Table       | Detail                                                                                    |
| ------ | ----------- | ----------------------------------------------------------------------------------------- |
| UPDATE | `all_calls` | Set `project_name = 'Naadi Healthcare Manteca'` where `project_name = 'Naadi Healthcare'` |
| DELETE | `projects`  | Remove the row where `project_name = 'Naadi Healthcare'`                                  |


### Prevention

The `normalizeProjectName` utility in the webhook handler already handles whitespace issues, but this was a substring mismatch (missing " Manteca"). A longer-term fix would be to add fuzzy matching or a project alias table, but for now manual cleanup is the pragmatic approach.