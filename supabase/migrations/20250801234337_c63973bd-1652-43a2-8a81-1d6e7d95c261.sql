-- Set password for Clarity Care project
UPDATE projects 
SET portal_password = hash_password('Password123')
WHERE project_name = 'Clarity Care';