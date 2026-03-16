

## Fix Access for althea.r@patientpromarketing.com

### Problem
The user exists in `auth.users` (created 2025-10-27) but is missing from:
- `profiles` table (no profile record)
- `user_roles` table (no role assigned)

Without a role, the AuthGuard blocks all access. The auth logs also show a recent failed attempt to re-create this user via the admin function (`email_exists` error at 16:56:58), which means an admin likely tried to add them again but it failed because the auth record already exists.

### Fix (Database Migration)
Insert the missing `profiles` and `user_roles` records for user ID `78c4bcc4-d599-477d-8a43-8efdcf03815e`:

```sql
-- Create missing profile
INSERT INTO public.profiles (id, email, full_name)
VALUES ('78c4bcc4-d599-477d-8a43-8efdcf03815e', 'althea.r@patientpromarketing.com', 'Althea Romero')
ON CONFLICT (id) DO NOTHING;

-- Assign agent role (matching typical PPM staff pattern)
INSERT INTO public.user_roles (user_id, role)
VALUES ('78c4bcc4-d599-477d-8a43-8efdcf03815e', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Decision Needed
Most `@patientpromarketing.com` users have the **admin** role (18 of 21). Should this user be assigned **admin** or **agent**? I'll default to **agent** unless you say otherwise.

### No Code Changes Required
This is purely a data fix — no application code needs to change.

