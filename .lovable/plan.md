# Strip Leaked AI Bot Prompts From Symptoms Field

## What's wrong
The "Symptoms" field on the Medical Information card is showing AI booking-bot instructions (Booking Rule, Booking Steps, Challenger Sale, Natural Language Suggestions, "Reference this data and ask them a relevant question…"). This text is part of a prompt template that was placed inside a GHL custom field and accidentally got captured into the patient intake payload. From there it flowed into `patient_intake_notes` and then our AI parser extracted it as `parsed_pathology_info.symptoms`.

This is the same class of issue that the existing sanitizer already blocks for the **Imaging Details** field — we just never extended that protection to **Symptoms**.

## Scope
- 128 appointments across 23 projects currently show corrupted symptoms.
- For VES (Vascular and Embolization Specialists) specifically, the two patients you're seeing are almost certainly **Anderson Williams** and **William Olivieri** (a third older one, Chris Duplantis, is also affected).

## Fix — three parts

### 1. Backfill clean-up (one-time)
For all 128 affected appointments, detect bot-prompt signatures in `parsed_pathology_info.symptoms` and clear the field (set to empty string or null). Signatures to match (case-insensitive):
- "Reference this data"
- "Booking Rule"
- "Booking Step"
- "Challenger Sale"
- "Natural Language Suggestions"
- Symptoms strings longer than ~400 chars (real symptoms are short comma-lists like "Sharp Pain, Swelling, Stiffness")

Done as a SQL migration that updates the JSONB in place.

### 2. Extend the sanitizer to the Symptoms field
In `supabase/functions/auto-parse-intake-notes/index.ts`, the existing GHL prompt sanitizer (currently scoped to imaging details per project memory) gets extended so that after the AI parse returns:
- If `parsed_pathology_info.symptoms` contains any of the bot-prompt signatures above, OR exceeds ~400 chars, OR contains URL/quote-heavy patterns typical of prompts, the symptoms value is wiped before saving.
- Also strip the same patterns from the raw `patient_intake_notes` text *before* sending to the AI, so the parser never sees them in the first place.

### 3. UI defensive render
In the Medical Information card (where Symptoms displays), add a final client-side guard: if symptoms still contains any of the signature phrases, hide the field entirely rather than render a wall of bot text. Belt-and-suspenders for any future prompt variants we haven't catalogued.

## What you'll see after
- The Williams and Olivieri (and Duplantis) cards in VES will no longer show the bot-prompt blob; the Symptoms row will simply be empty.
- The other 125 affected patients across the 22 other projects get cleaned up in the same migration.
- New appointments synced from GHL with similar prompt leakage will be sanitized automatically and never display the bot text.

## What this does NOT do
- It does not fix the upstream GHL configuration that keeps injecting the prompt into intake payloads. That is a config change that has to be made inside the GHL sub-account (likely a workflow or custom-field default value containing the bot system prompt). Recommend flagging this to whoever owns the GHL automations so the source can be cleaned up — our portal sanitizer is a safety net, not a replacement for fixing the source.
