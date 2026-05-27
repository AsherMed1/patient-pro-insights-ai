UPDATE public.all_appointments
SET review_status = 'approved', updated_at = now()
WHERE id IN (
  '3d6f1732-0703-4729-87d6-00e53f0aa10a',
  'f87651f1-845c-4d0d-b913-606cd5690927',
  '21f02a4f-005d-458d-838a-b6d3c1c48739',
  'ae67cfa6-c9af-420d-b07a-a5dd7b28044f'
) AND review_status = 'declined';