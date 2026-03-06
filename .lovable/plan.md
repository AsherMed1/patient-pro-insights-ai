

## Update Per-Clinic Short-Notice Thresholds

The current implementation has all projects set to the default 72 hours. Two things need to happen:

### 1. Add missing dropdown options (1h, 12h, 24h, 120h)

The `EditProjectDialog.tsx` dropdown currently only offers 0, 48, 72, 168. Need to add: 1, 12, 24, and 120 hour options.

**File: `src/components/projects/EditProjectDialog.tsx`** (lines 290-295)
- Add SelectItems for: 1 hour, 12 hours, 24 hours, 120 hours (5 days)

### 2. Bulk-update existing project thresholds

Use the Supabase insert/update tool to set each project's `short_notice_threshold_hours` per your spec:

| Threshold | Projects |
|-----------|----------|
| 1 hour | Vascular Surgery Center of Excellence |
| 12 hours | Champion Heart and Vascular Center |
| 24 hours | AVA Vascular |
| 48 hours | Fayette Surgical Associates, Liberty Joint & Vascular, Murfreesboro Vascular and Intervention, Premier Vascular, Ventra Medical Advanced Interventions, Vascular Solutions of North Carolina |
| 72 hours | AIC (Arterial Interventional Centers), Ally Vascular and Pain Centers, Apex Vascular, Allegheny Vein & Vascular, Buffalo Vascular Care, Davis Vein & Vascular, Georgia Endovascular, Joint & Vascular Institute, Middle Tennessee Vascular, Naadi Healthcare, NG Vascular and Vein Center, Richmond Vascular Center, Southern Tennessee Cardiology, Texas Endovascular - Dallas Vein Clinic, Texas Endovascular - Houston Vein Clinic, The Painless Center, Texas Vascular Institute, Vascular and Embolization Specialists, Vascular Surgery Associates |
| 120 hours | ECCO Medical, Vivid Vascular |
| 168 hours | Alliance Vascular, Ozark Regional Vein and Artery Center, Prospero Vascular and Interventional, Texas IR & Interventional Oncology, Vascular Institute of Michigan |

The 72-hour projects are already correct (default). So we only need to update the non-72-hour clinics.

### Changes Summary

| File | Change |
|------|--------|
| `src/components/projects/EditProjectDialog.tsx` | Add 1h, 12h, 24h, 120h options to the threshold dropdown |
| Data update (via insert tool) | Set correct threshold values for ~14 projects that differ from the 72h default |

