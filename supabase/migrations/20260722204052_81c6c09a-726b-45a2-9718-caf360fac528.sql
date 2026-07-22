ALTER TABLE public.qa_cases DROP CONSTRAINT IF EXISTS qa_cases_error_category_check;
ALTER TABLE public.qa_cases ADD CONSTRAINT qa_cases_error_category_check CHECK (
  error_category IS NULL OR error_category = ANY (ARRAY[
    'Missing Insurance','Missing Address','Notes Added to Portal','Duplicate Appointment',
    'Booking Rule Violation','Uploaded Insurance','Name Correction','Double Booked',
    'Incorrect Patient Info','Other'
  ])
);