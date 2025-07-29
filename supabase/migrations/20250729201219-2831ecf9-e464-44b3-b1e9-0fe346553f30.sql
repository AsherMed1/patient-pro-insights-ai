-- Reset the double-hashed passwords to a fresh hash
UPDATE projects 
SET portal_password = public.hash_password('password123') 
WHERE project_name IN ('Apex Vascular ', 'Champion Heart and Vascular Center');