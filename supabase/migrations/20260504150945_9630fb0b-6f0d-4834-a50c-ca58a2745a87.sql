UPDATE public.appointment_notes
SET created_by = 'System',
    note_text = 'Status restored to "Confirmed" by Support — prior status updates were silently blocked by a permissions gap that has now been fixed.'
WHERE id = 'e9ff8741-3520-45cb-a550-afc69709db92';