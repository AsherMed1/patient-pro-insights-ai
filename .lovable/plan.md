

# Fix PFE Procedure Description (Plantar Fasciitis, Not Pelvic Floor)

## Problem

The AI parser prompt on line 1325 of `auto-parse-intake-notes/index.ts` incorrectly defines PFE as **"Pelvic Floor Embolization"** with symptoms like "pelvic pain, pelvic floor dysfunction." PFE actually stands for **Plantar Fasciitis Embolization**, which focuses on heel pain, foot pain, and plantar fasciitis symptoms.

This causes the AI to hallucinate "pelvic pain" as the primary complaint and "pelvic floor" as the affected area, even though the raw GHL data clearly describes heel pain and plantar fasciitis symptoms.

## Changes

### File: `supabase/functions/auto-parse-intake-notes/index.ts`

**Line 1325** -- Update the PFE procedure context:

```
// Before:
PFE (Pelvic Floor Embolization) focuses on: pelvic pain, pelvic floor dysfunction symptoms. Set procedure_type to "PFE".

// After:
PFE (Plantar Fasciitis Embolization) focuses on: heel pain, plantar fasciitis, sharp pain in the bottom of the heel, foot pain that worsens with first steps in the morning, pain that improves with rest. Set procedure_type to "PFE".
```

**Line 1055** -- Also update the procedure detection keyword (currently maps "pelvis" and "pelvic floor" to PFE, which is incorrect):

```
// Before:
if (name.includes('pfe') || name.includes('pelvis') || name.includes('pelvic floor'))

// After:
if (name.includes('pfe') || name.includes('plantar'))
```

**Line 657** -- Same fix in the STEP field detection:

```
// Before:
if (upperKey.includes('PFE') || upperKey.includes('PELVIC FLOOR'))

// After:
if (upperKey.includes('PFE') || upperKey.includes('PLANTAR'))
```

### Deploy and Reparse

Deploy the updated `auto-parse-intake-notes` edge function and trigger a reparse for the Ricky Rooks appointment to verify the corrected output shows heel/plantar fasciitis data instead of pelvic floor.

