-- Delete Marissa Kresnik user (06acac63-475d-49db-8a78-ec17c19a3b63)

-- Delete from project_user_access first (foreign key constraints)
DELETE FROM public.project_user_access
WHERE user_id = '06acac63-475d-49db-8a78-ec17c19a3b63';

-- Delete from user_roles
DELETE FROM public.user_roles
WHERE user_id = '06acac63-475d-49db-8a78-ec17c19a3b63';

-- Delete from profiles
DELETE FROM public.profiles
WHERE id = '06acac63-475d-49db-8a78-ec17c19a3b63';

-- Delete from auth.users
DELETE FROM auth.users
WHERE id = '06acac63-475d-49db-8a78-ec17c19a3b63';