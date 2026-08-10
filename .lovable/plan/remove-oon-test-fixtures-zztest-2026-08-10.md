# Remove OON test fixtures (ZZTEST)

Clean up the seeded test records created while building the Potential OON safeguard.

## Records to delete

6 appointments (all named `ZZTEST ...`):

| Name | Project | Status |
|---|---|---|
| ZZTEST Leak Check | PPM Live Test - New AI Bot | Confirmed / pending |
| ZZTEST Generic Answer | PPM - Test Account | Confirmed / pending |
| ZZTEST Deny Patient | PPM - Test Account | OON |
| ZZTEST Deny Setter | PPM - Test Account | Confirmed / pending |
| ZZTEST Allow Good | PPM - Test Account | Confirmed / pending |
| ZZTEST Allow Bad | PPM - Test Account | Confirmed / pending |

Linked child rows found: 3 QA cases, 9 appointment notes. No recapture cases or short-notice alerts.

## Steps

1. Migration deletes, in order: `qa_note_mentions`/`qa_case_notes`/`qa_case_activity` for the linked QA cases, then `qa_cases`, then `appointment_notes`, then the 6 rows in `all_appointments`, scoped by the explicit appointment IDs.
2. Verify by re-querying for any remaining `lead_name ilike '%zztest%'` rows and orphaned QA cases.

## Not touched

Insurance rules/canonical plans, block rules, and the Slack webhook config stay as-is — they are real feature configuration, not test data. Say the word if you also want the test-account insurance rules removed.
