-- Clean corrupted detected_insurance_* values that contain leaked GHL summary template text.
-- Only nullifies the corrupted columns; does NOT touch parsed_insurance_info JSON, links, etc.
UPDATE public.all_appointments
SET
  detected_insurance_provider = CASE
    WHEN detected_insurance_provider ~* '(GAE Info|PFE Info|UFE Info|PAE Info|HAE Info|PAD Info|FSE Info|TAE Info|No fields found in your shared list|Insurance Phone:|Group Number:|Upload Card:|Insurance Notes:)'
      OR length(detected_insurance_provider) > 80
    THEN NULL ELSE detected_insurance_provider END,
  detected_insurance_plan = CASE
    WHEN detected_insurance_plan ~* '(GAE Info|PFE Info|UFE Info|PAE Info|HAE Info|PAD Info|FSE Info|TAE Info|No fields found in your shared list|Insurance Phone:|Group Number:|Upload Card:|Insurance Notes:)'
      OR length(detected_insurance_plan) > 80
    THEN NULL ELSE detected_insurance_plan END,
  detected_insurance_id = CASE
    WHEN detected_insurance_id ~* '(GAE Info|PFE Info|UFE Info|PAE Info|HAE Info|PAD Info|FSE Info|TAE Info|No fields found in your shared list|Insurance Phone:|Group Number:|Upload Card:|Insurance Notes:)'
      OR length(detected_insurance_id) > 80
    THEN NULL ELSE detected_insurance_id END,
  updated_at = now()
WHERE
  (detected_insurance_provider ~* '(GAE Info|PFE Info|UFE Info|PAE Info|HAE Info|PAD Info|FSE Info|TAE Info|No fields found in your shared list|Insurance Phone:|Group Number:|Upload Card:|Insurance Notes:)'
   OR length(coalesce(detected_insurance_provider,'')) > 80)
  OR (detected_insurance_plan ~* '(GAE Info|PFE Info|UFE Info|PAE Info|HAE Info|PAD Info|FSE Info|TAE Info|No fields found in your shared list|Insurance Phone:|Group Number:|Upload Card:|Insurance Notes:)'
      OR length(coalesce(detected_insurance_plan,'')) > 80)
  OR (detected_insurance_id ~* '(GAE Info|PFE Info|UFE Info|PAE Info|HAE Info|PAD Info|FSE Info|TAE Info|No fields found in your shared list|Insurance Phone:|Group Number:|Upload Card:|Insurance Notes:)'
      OR length(coalesce(detected_insurance_id,'')) > 80);