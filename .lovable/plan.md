# Liberty Joint & Vascular — DOB / Info Investigation

## What I found in the database

Checked all three patients directly against `all_appointments` (Liberty Joint & Vascular project):

| Patient | DOB in Portal | DOB in GHL contact payload | Age | Status |
| --- | --- | --- | --- | --- |
| **Jeanette Moore** (id `3fb0151e…`) | ✅ 1948-05-21 | ✅ present in GHL | 78 | Fine — already populated |
| **Yvonne Osbourne** (id `18c77ecf…`) | ✅ 1961-05-15 | ❌ not in GHL contact fields | 65 | Fine in portal — but GHL has no DOB |
| **Yvette Molina** (id `495231e5…`) | ❌ null | ❌ not in GHL contact fields | — | Genuinely missing everywhere |

Other parsed info (insurance, pathology, contact, medical) is populated for all three — this is a DOB-only gap, not a broader parse failure.

## Root cause

Liberty Joint & Vascular's GHL intake flow is **not capturing Date of Birth as a structured contact field**. The webhook payload's `Contact Information` block only contains Name/Email/Phone/Address — no `Date of Birth` line — unless a setter manually enters it on the contact. The AI parser can only populate DOB when GHL sends it (or when it's clearly written in the intake notes body); for these three, it wasn't.

- Jeanette had DOB because her GHL contact record has it filled in.
- Yvonne's DOB was likely added later manually (portal `updated_at` is newer than `created_at`; her intake notes literally say *"The patient will provide their full address and date of birth at the visit"*).
- Yvette's DOB has never been provided — her notes explicitly show *"[Your Medicare Member ID]"* placeholder and the setter didn't collect DOB during the booking call.

**This is not a portal bug — it's a data-capture gap in the GHL setter workflow / intake form for Liberty.**

## Recommended fix (needs your decision)

### Option A — Fix in GHL (recommended, permanent)
Update the Liberty Joint & Vascular GHL intake form / setter script so **Date of Birth is a required field** before an appointment can be booked (same as most other clinics). Once added, GHL will send it in the contact payload and the portal will auto-populate DOB + Age via the existing sync.

**You'll need to do this in GHL** — I can't edit GHL forms from the portal.

### Option B — Manual portal update for Yvette now
For Yvette Molina specifically, someone needs to call/message the patient to get her DOB, then edit it in the portal (DOB field on the appointment card). The portal→GHL sync will push it back to GHL.

Jeanette and Yvonne are already fixed — no action needed.

## What I will NOT change in code
No parser or webhook change is warranted — the AI already extracts DOB correctly when GHL provides it. Adding heuristics to guess DOB from free-text notes would create false positives.

## Next step
Tell me:
1. Do you want me to add a portal-side visual flag (e.g., red badge on the appointment card) when DOB is missing, so setters/QA see it before the appointment? Or
2. Just handle Yvette manually and fix the GHL form on your side?
