UPDATE public.all_appointments
SET parsed_pathology_info = COALESCE(parsed_pathology_info, '{}'::jsonb)
      || jsonb_build_object(
           'previous_treatments', 'Injections, Supplements',
           'primary_complaint', 'Pain in both knees for the last 2 years; diagnosed with arthritis and bone on bone'
         ),
    parsed_insurance_info = COALESCE(parsed_insurance_info, '{}'::jsonb)
      || jsonb_build_object(
           'insurance_notes', 'Patient has Medicare Part A and B, and Aetna as a supplemental plan, but has not received the Aetna card yet.'
         ),
    updated_at = now()
WHERE id = '7df804ee-3c83-40a2-982a-02529bead68c';