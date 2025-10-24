-- Enable RLS on payroll_employees
ALTER TABLE public.payroll_employees ENABLE ROW LEVEL SECURITY;

-- Drop all insecure policies that expose salary data
DROP POLICY IF EXISTS "Allow anon to manage payroll employees" ON public.payroll_employees;
DROP POLICY IF EXISTS "Allow anon to view payroll employees" ON public.payroll_employees;
DROP POLICY IF EXISTS "Authenticated users can view payroll employees" ON public.payroll_employees;
DROP POLICY IF EXISTS "Authenticated users can insert payroll employees" ON public.payroll_employees;
DROP POLICY IF EXISTS "Authenticated users can update payroll employees" ON public.payroll_employees;
DROP POLICY IF EXISTS "Authenticated users can delete payroll employees" ON public.payroll_employees;
DROP POLICY IF EXISTS "Agents can view payroll employees" ON public.payroll_employees;

-- Revoke all public/anon access to salary data
REVOKE ALL ON public.payroll_employees FROM anon;
REVOKE ALL ON public.payroll_employees FROM public;

-- Keep admin-only access (policy already exists, just ensuring it's correct)
-- Admins can manage payroll employees policy already exists and is correct