
-- Update short_notice_threshold_hours for non-72-hour clinics

-- 1 hour
UPDATE projects SET short_notice_threshold_hours = 1 WHERE project_name = 'Vascular Surgery Center of Excellence';

-- 12 hours
UPDATE projects SET short_notice_threshold_hours = 12 WHERE project_name = 'Champion Heart and Vascular Center';

-- 24 hours
UPDATE projects SET short_notice_threshold_hours = 24 WHERE project_name = 'AVA Vascular';

-- 48 hours
UPDATE projects SET short_notice_threshold_hours = 48 WHERE project_name IN (
  'Fayette Surgical Associates',
  'Liberty Joint & Vascular',
  'Murfreesboro Vascular and Intervention',
  'Premier Vascular',
  'Ventra Medical Advanced Interventions',
  'Vascular Solutions of North Carolina'
);

-- 120 hours (5 days)
UPDATE projects SET short_notice_threshold_hours = 120 WHERE project_name IN (
  'ECCO Medical',
  'Vivid Vascular'
);

-- 168 hours (7 days)
UPDATE projects SET short_notice_threshold_hours = 168 WHERE project_name IN (
  'Alliance Vascular',
  'Ozark Regional Vein and Artery Center',
  'Prospero Vascular and Interventional',
  'Texas IR & Interventional Oncology',
  'Vascular Institute of Michigan'
);
