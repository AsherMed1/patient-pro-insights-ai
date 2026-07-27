## Problem

Juan Gonzales, Texas Endovascular - Dallas Vein Clinic, record `17366ebf` (Scheduled, Aug 11) parsed on Jul 15 with several gaps and one wrong value:

- Insurance ID (`Y4P255M98158`), group number (`LO6351M210`), and plan (`BCBS`) are all empty even though they are in the notes
- `insurance_notes` holds an unrelated AI conversation summary ("No specific urinary symptoms... were provided") instead of the real intake note about weak stream, frequent urination, Tamsulosin, enlarged prostate, and an MRI 2 months ago
- PCP name/phone empty — notes have a combined field "Primary Care Doctor's Name and Phone: Dr Belton, 469 647 4250"
- Pathology `symptoms` empty despite "Weak urine stream, Erectile dysfunction"; no imaging captured (MRI ~2 months ago with urologist)

(The other two Juan records — Juan Jose Gonzalez `aa5ff228`, Cancelled, and Juan Gonzalez `0bbb1437`, Texas Vascular Institute — are separate patients and stay untouched.)

## Fix

1. Force a re-parse of `17366ebf` via `auto-parse-intake-notes` (`{"appointmentId": "..."}`).
2. Verify, then apply a targeted data update for whatever is still missing, using values from the notes:
   - Insurance: provider BCBS of TX, plan BCBS, ID `Y4P255M98158`, group `LO6351M210`, and replace the bogus AI summary in insurance notes with the real intake note
   - Medical & PCP: split the combined field into Dr Belton / 469 647 4250; imaging details "MRI approximately 2 months ago with urologist"
   - PAE/BPH pathology: symptoms weak urine stream and erectile dysfunction; BPH diagnosed more than 1 year ago; treatments tried daily medication (Tamsulosin/Finasteride/Dutasteride) with no improvement; no catheter; surgery not recommended; unhappy with quality of life; seeking a less invasive option; enlarged prostate worsening over the past month

Single-record repair, no app code changes.
