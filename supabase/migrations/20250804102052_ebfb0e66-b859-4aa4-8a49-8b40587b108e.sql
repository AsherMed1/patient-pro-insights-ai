-- Update all project passwords to 'password123'
UPDATE public.projects 
SET portal_password = public.hash_password('password123')
WHERE active = true;