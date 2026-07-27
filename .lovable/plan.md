## Problem

Serrena Lovelace, NG Vascular and Vein Center, record `a426aa7c` (Scheduled, Jul 23 appt) was stamped parsed on Jul 16 but every parsed field except `procedure_type: PAD` is empty:

- Insurance: provider, plan, and ID all empty — notes clearly show Healthy Indiana Plan / ID `100294183799`
- Medical & PCP: empty — notes show Alfonso Bloom / 219 398 9840, and "Had Imaging Before?: Ultrasounds - Saint Catherine Hospital"
- Pathology: side, symptoms, wounds, vascular-provider status all empty despite five PAD STEP answers present in the notes

The intake notes are complete, so this is the same empty-parse failure already hardened against for newer records — this one predates the fix.

## Fix

1. Force a re-parse of `a426aa7c` through `auto-parse-intake-notes` (`{"appointmentId": "..."}`) so the current parser rewrites the record from its own notes.
2. Verify the result, then apply a targeted data update for anything still missing, taken straight from the notes:
   - Insurance: provider Healthy Indiana Plan, plan Healthy Indiana Plan, ID `100294183799`
   - Medical & PCP: Alfonso Bloom, 219 398 9840; imaging details "Ultrasounds — Saint Catherine Hospital"
   - PAD pathology: affected side Both (legs/feet), no open wounds or sores, rest pain in toes when lying down that improves when dangling the leg or sitting, not currently under the care of a vascular provider, age range under 50 at intake, location Merrillville, Indiana

No app code changes needed — this is a single-record repair scoped to one appointment id.
