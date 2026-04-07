

## Fix: Christopher Roff (Ventra HAE) — Missing Medical Information

### Root Cause

Two gaps prevent HAE data from being captured:

1. **Webhook handler (`ghl-webhook-handler`)**: The pathology field categorizer (line 493) matches `pae`, `ufe`, `gae` but does NOT include `hae`, `hemorrhoid`, `rectal`, `bowel`, or `colonoscopy`. When the GHL webhook fires, HAE-related custom fields are not categorized as pathology — they either fall into the generic "contact" bucket or are dropped. This is why the stored `patient_intake_notes` only shows `Pathology(by procedure): GAE: Age Range 56 and above` and nothing for HAE.

2. **Auto-parse AI prompt (`auto-parse-intake-notes`)**: The procedure context builder (lines 1500-1505) has entries for UFE, PAE, GAE, PFE, PAD, and FSE — but **no entry for HAE**. When parsing an HAE appointment, the AI gets no guidance about hemorrhoid-related symptoms, rectal bleeding, colonoscopy, etc.

### Fix (2 files + 1 re-parse)

**File 1: `supabase/functions/ghl-webhook-handler/index.ts`**
- Add HAE keywords to the pathology categorizer (line 493): `hae`, `hemorrhoid`, `rectal`, `bowel`, `colonoscopy`, `bleeding`
- Add HAE keywords to the medical categorizer (line 502): `constipation` (if relevant to medical context)

**File 2: `supabase/functions/auto-parse-intake-notes/index.ts`**
- Add HAE procedure context to the AI prompt builder (after line 1505):
  ```
  HAE (Hemorrhoid Artery Embolization) focuses on: rectal bleeding, internal/external hemorrhoids, 
  bowel discomfort, constipation, colonoscopy results, hemorrhoid diagnosis, bleeding duration. 
  Set procedure_type to "HAE".
  ```

**Post-deploy: Re-parse Christopher Roff**
- Reset `parsing_completed_at` to null for his record so the auto-parser re-processes with the corrected logic
- The auto-parser will re-fetch GHL custom fields (Ventra has GHL credentials configured) and now correctly extract HAE-specific data

### Summary

| Change | File | What |
|--------|------|------|
| Add HAE keywords to pathology categorizer | ghl-webhook-handler/index.ts | `hae`, `hemorrhoid`, `rectal`, `bowel`, `colonoscopy`, `bleeding` |
| Add HAE context to AI prompt | auto-parse-intake-notes/index.ts | HAE procedure description for AI extraction |
| Re-parse patient | Database update | Reset parsing_completed_at for Christopher Roff |

