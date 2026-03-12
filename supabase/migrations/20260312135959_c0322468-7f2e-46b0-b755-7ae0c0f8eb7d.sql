
-- Update short-notice thresholds for all clinics

-- 36 hours
UPDATE projects SET short_notice_threshold_hours = 36 
WHERE project_name IN ('AVA Vascular', 'Fayette Surgical Associates', 'Liberty Joint & Vascular', 'Murfreesboro Vascular and Intervention', 'Premier Vascular', 'Ventra Medical Advanced Interventions', 'Vascular Solutions of North Carolina');

-- 60 hours
UPDATE projects SET short_notice_threshold_hours = 60 
WHERE project_name IN ('Ally Vascular  and Pain Centers', 'Allegheny Vein & Vascular', 'Davis Vein & Vascular', 'Georgia Endovascular', 'NG Vascular and Vein Center', 'Richmond Vascular Center', 'Texas Endovascular - Houston Vein Clinic', 'Texas Endovascular - Dallas Vein Clinic', 'The Painless Center', 'Vascular Surgery Associates');

-- 84 hours
UPDATE projects SET short_notice_threshold_hours = 84 
WHERE project_name IN ('Arterial Interventional Centers', 'Apex Vascular', 'Buffalo Vascular Care', 'Joint & Vascular Institute', 'Middle Tennessee Vascular', 'Naadi Healthcare', 'Southern Tennessee Cardiology', 'Texas Vascular Institute', 'Vascular and Embolization Specialists');

-- 132 hours
UPDATE projects SET short_notice_threshold_hours = 132 
WHERE project_name IN ('ECCO Medical', 'Vivid Vascular', 'Alliance Vascular', 'Ozark Regional Vein and Artery Center', 'Prospero Vascular and Interventional', 'Texas IR & Interventional Oncology', 'Vascular Institute of Michigan');
