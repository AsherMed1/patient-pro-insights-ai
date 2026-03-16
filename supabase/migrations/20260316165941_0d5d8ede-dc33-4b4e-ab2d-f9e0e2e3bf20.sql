-- Insert missing profile for Althea Romero
INSERT INTO public.profiles (id, email, full_name)
VALUES ('78c4bcc4-d599-477d-8a43-8efdcf03815e', 'althea.r@patientpromarketing.com', 'Althea Romero')
ON CONFLICT (id) DO NOTHING;

-- Assign agent role
INSERT INTO public.user_roles (user_id, role)
VALUES ('78c4bcc4-d599-477d-8a43-8efdcf03815e', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;