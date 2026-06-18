# ATE (Achilles Tendinitis) Survey Capture — Plan

## Investigation finding

I pulled the most recent JVI ATE intake notes (e.g. `JVI Test`, calendar "Request Your ATE Consultation - Libertyville, IL", 6/17). The full GHL payload our webhook receives contains **only two** pathology fields:

```
Pathology Information:
  STEP 1 | How would you rate your pain on a scale of 0–10?: 5
  STEP 1 | Where is your pain located?: Middle of the Achilles tendon
```

These are exactly the two answers from Opt-In 1 slides 3 & 4 (the ones currently showing). **No other slide answers are present in the GHL payload at all** — not in the contact custom fields, not in the appointment notes, nowhere.

**Root cause: upstream GHL configuration.** The funnel slides for Opt-In 1 (slides 1 & 6) and Opt-In 2 (slides 2, 4, 6) are not mapped to GHL contact custom fields, so GHL never sends them to us. Our parser cannot extract data that does not exist in the inbound payload.

## What needs to happen

### Step 1 — GHL side (user/Marissa, not code)
For each missing slide, map the funnel form field to a GHL contact custom field. Without this, no parser/UI change on our side will help.

The slides we know of from your message:
- Opt-In 1, Slide 1 — ?
- Opt-In 1, Slide 6 — ?
- Opt-In 2, Slide 2 — ?
- Opt-In 2, Slide 4 — ?
- Opt-In 2, Slide 6 — ?

I need the question text and answer options for each so I can match them to existing fields (Duration, Treatments Tried, Imaging, etc.) or recommend new GHL custom field names.

### Step 2 — Our side (code, after Step 1)
Once GHL is sending the new fields, I will:

1. **Extend the ATE parser** in `parse-intake-notes` (or relevant edge function) to extract the new `STEP X | …` lines from `Pathology Information:` / `Medical Information:` / `Additional Information:` sections.
2. **Persist** them into `parsed_pathology_info` JSONB on `all_appointments` (e.g. `duration`, `treatments_tried`, `imaging_done`, `symptoms`, plus any ATE-specific keys).
3. **Display** them in two places per your selection ("Medical Information + ATE panel"):
   - **ATE Survey Fields** card — list each captured slide answer as its own row (matching the existing "STEP 1 | …" pattern in your screenshot).
   - **Medical Information** card — surface the structured fields that already have homes there (Pain Level is already shown; add Duration, Treatments Tried, Imaging if mapped).
4. **Reparse** existing JVI ATE appointments so the new fields backfill where the data is present.

## Open questions blocking Step 2

1. What are the actual questions on Opt-In 1 slides 1 & 6 and Opt-In 2 slides 2, 4, 6?
2. Do you (or the JVI team) want me to reach out about the GHL form field mapping, or will Marissa configure that and ping me when it's live?

## Technical notes

- ATE notes follow the same `=== GHL Contact Data (Full) ===` block pattern as other JVI procedures, so the parser change is small (add the new `STEP X | …` regex keys to the ATE branch and write them to `parsed_pathology_info`).
- No DB migration needed — `parsed_pathology_info` is JSONB; new keys slot in.
- UI: extend `ATESurveyFields` (or whatever component renders the screenshot card) to iterate over a known list of step keys instead of hardcoding the two it currently shows.

## Recommended next action

Reply with the slide questions (or a screenshot of each slide), and confirm who owns the GHL form mapping. Once GHL is updated and we see a new test lead arrive with the extra fields, I'll ship the parser + UI changes in one pass.
