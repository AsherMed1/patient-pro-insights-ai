# Clean up the "Other" line in Medical Information

## What's wrong

For Champion Test, the stored value is already well-formed:

```text
Currently under the care of a vascular provider; Former tobacco user; Ultrasound at Champion Vascular in June 2026
```

Two display problems:

1. The card strips every `,` `;` `|` separator and replaces it with a plain space, so the three separate facts run together as one sentence.
2. The imaging fact is duplicated. The same appointment already stores `Imaging Details: "Yes I had an Ultrasound at Champion Vascular in June 2026"` and `Imaging Type: Ultrasound`, which render in the Imaging section. Repeating it in "Other" is noise.

## The fix (display layer only)

In the Medical Information card's "Other" renderer:

- Split the value on `;` / `|` / newlines into individual facts, trim them, drop empties, and re-join with `; ` so each fact stays visually separate. Existing noise filters (tobacco boilerplate, blood thinners, vascular provider phrasing) keep running per fact instead of over the whole string.
- Drop any fact that is imaging content when imaging is already shown elsewhere: if the appointment has `imaging_details`, `imaging_type`, or `imaging_done`, remove facts matching imaging keywords (ultrasound, x-ray/xray, MRI, CT, CTA, doppler, angiogram, scan, imaging).
- If nothing survives, the "Other" line is hidden entirely, as it is today.

No parser or database changes — the underlying data is already correct, so this fixes existing records immediately with no re-parse.

## Technical detail

File: `src/components/appointments/ParsedIntakeInfo.tsx`, the `parsedPathologyInfo.other_notes` block (~line 1304). Replace the blanket `.replace(/\s*[,;|]\s*/g, ' ')` with a split/filter/rejoin pipeline and an imaging-dedupe filter driven by `parsedMedicalInfo?.imaging_details` / `parsedPathologyInfo?.imaging_type` / `imaging_done`.

Result for this patient:

```text
Other: Currently under the care of a vascular provider; Former tobacco user
```
