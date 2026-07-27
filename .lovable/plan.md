## Goal

Fill in the missing patient details for Adrienne Myrick (NG Vascular and Vein Center) so the portal card matches what GHL actually sent.

## What I verified

One non-superseded record exists: `df580f7f-b64d-4664-aa6c-d68f79fcbc12`, status "No Show", appointment 2026-05-30. The GHL intake notes on that record contain complete data, but three areas were not carried into the parsed fields:

| Field | Currently stored | In the intake notes |
|---|---|---|
| Insurance ID number | empty | U0835787801 |
| PCP name | "Julie Taylor (312) 878-9240" (name and phone merged) | Julie Taylor |
| PCP phone | empty | (312) 878-9240 |
| Symptoms | empty | numbness, cold feet, or discoloration that doesn't improve |
| Affected area | empty | legs and feet |
| Medical conditions | not stored | Hypertension |

Demographics (DOB 1974-12-06, age 51), smoking status (Former), blood thinners (No), and the PAD screening answers are already correct — those stay untouched.

## Changes

Single data update to that one record:

- Set the insurance ID number to U0835787801 (parsed insurance object plus the detected-insurance columns), keeping Cigna / group 3337417 as-is.
- Split the PCP field into name "Julie Taylor" and phone "(312) 878-9240".
- Populate PAD pathology: primary complaint, affected area (legs and feet), symptoms summary from the Step 1/Step 2 answers, and Hypertension as the reported medical condition.

No code or parser changes — the parser hardening from the recent fixes already covers these patterns; this record predates the parse and has `parse_attempts = 0`.

## Verification

Re-query the record after the update and confirm the insurance, medical, and pathology cards are all populated.
