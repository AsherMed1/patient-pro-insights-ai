

## Update Short-Notice Alert Thresholds

### 1. Add new threshold options to the UI dropdown
**File: `src/components/projects/EditProjectDialog.tsx`** (lines 290-299)

Add four new options: 36h, 60h, 84h, 132h. Full updated list:
- Disabled (0), 1h, 12h, 24h, **36h (1.5 days)**, 48h, **60h (2.5 days)**, 72h, **84h (3.5 days)**, 120h, **132h (5.5 days)**, 168h

### 2. Bulk data update for clinics

Using the insert/update tool to run UPDATE statements:

| Threshold | Clinics |
|-----------|---------|
| **36** | AVA Vascular, Fayette Surgical Associates, Liberty Joint & Vascular, Murfreesboro Vascular and Intervention, Premier Vascular, Ventra Medical Advanced Interventions, Vascular Solutions of North Carolina |
| **60** | Ally Vascular and Pain Centers, Allegheny Vein & Vascular, Davis Vein & Vascular, Georgia Endovascular, NG Vascular and Vein Center, Richmond Vascular Center, Texas Endovascular - Houston Vein Clinic, Texas Endovascular - Dallas Vein Clinic, The Painless Center, Vascular Surgery Associates |
| **84** | Arterial Interventional Centers, Apex Vascular, Buffalo Vascular Care, Joint & Vascular Institute, Middle Tennessee Vascular, Naadi Healthcare, Southern Tennessee Cardiology, Texas Vascular Institute, Vascular and Embolization Specialists |
| **132** | ECCO Medical, Vivid Vascular, Alliance Vascular, Ozark Regional Vein and Artery Center, Prospero Vascular and Interventional, Texas IR & Interventional Oncology, Vascular Institute of Michigan |

### Note on Premier Vascular
You listed Premier Vascular under both 36h (PFE) and 132h (GAE & UFE). Since it's a single project in the database, it can only have one threshold. I'll set it to **36h** (the shorter/more urgent window). If you need different thresholds by procedure type, that would require a separate feature. Let me know if you'd prefer a different approach.

### Name matching
- "Buffalo Vascular Associates" → matches **Buffalo Vascular Care** in DB
- "Naadi Healthcare Marileca" → matches **Naadi Healthcare** in DB
- "Premier Vascular (GAE & UFE)" → same project as **Premier Vascular**

