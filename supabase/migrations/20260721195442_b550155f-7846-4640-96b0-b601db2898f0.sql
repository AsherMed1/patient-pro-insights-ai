ALTER TABLE public.qa_cases DROP CONSTRAINT IF EXISTS qa_cases_resolution_type_check;
ALTER TABLE public.qa_cases ADD CONSTRAINT qa_cases_resolution_type_check
  CHECK (resolution_type IS NULL OR resolution_type = ANY (ARRAY[
    'Resolved by QA','Escalated to Tech','Escalated to AM','Escalated to Gloria','Other'
  ]));