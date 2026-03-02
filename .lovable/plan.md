

## Merge Naadi Healthcare → Naadi Healthcare Manteca

### Current State
- **Naadi Healthcare** (id: `189ad370`): 6 appointments, 0 leads, 0 calls
- **Naadi Healthcare Manteca** (id: `347a60ba`): 1081 leads, 1605 calls, 224 appointments

### Steps (all data operations via insert tool)

1. **Move 6 appointments** from "Naadi Healthcare" to "Naadi Healthcare Manteca"
   ```sql
   UPDATE all_appointments SET project_name = 'Naadi Healthcare Manteca', updated_at = now()
   WHERE project_name = 'Naadi Healthcare';
   ```

2. **Delete the orphan project** "Naadi Healthcare"
   ```sql
   DELETE FROM projects WHERE id = '189ad370-5cc1-4c78-a5fd-06db985c3967';
   ```

3. **Rename** "Naadi Healthcare Manteca" → "Naadi Healthcare"
   - Update the `projects` table name
   - Update `project_name` on the 230 appointments (now including the 6 transferred)
   - Update `project_name` on leads and calls
   ```sql
   UPDATE projects SET project_name = 'Naadi Healthcare', updated_at = now()
   WHERE id = '347a60ba-ea98-4180-9ee8-ea8fa5bd187f';

   UPDATE all_appointments SET project_name = 'Naadi Healthcare', updated_at = now()
   WHERE project_name = 'Naadi Healthcare Manteca';

   UPDATE new_leads SET project_name = 'Naadi Healthcare'
   WHERE project_name = 'Naadi Healthcare Manteca';

   UPDATE all_calls SET project_name = 'Naadi Healthcare'
   WHERE project_name = 'Naadi Healthcare Manteca';
   ```

No code changes needed — this is purely a data migration.

