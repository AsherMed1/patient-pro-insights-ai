# Unauthorized activity review — ricardo.l@patientpromarketing.com ("Allahu AKbar")

## What the audit trail shows (verified in the database)

Two display names, one person: `Ricardo Lopez` until Aug 30 17:15 UTC, then `Allahu AKbar` from 17:17 onward (the profile name was changed mid-session). No matching row currently exists in `profiles` or `auth.users` for that email or name, so the account looks already deleted or renamed again — this needs confirmation before anything else.

Session of Aug 30, 2026, 17:17–17:33 UTC (about 16 minutes):

```text
17:17–17:23   50 x "Dismissed from Review Queue" across 25 different clinics
17:23         1 x restore (Amogh Test-102, Emage)
17:24:07      Keona Jordan (Emage) Confirmed -> Cancelled
17:24:23      Keona Jordan Cancelled -> Confirmed  (16 seconds later)
17:26:16      Keona Jordan renamed to "puta madre", DOB set
17:27:11      Abusive clinic-visible note on Tommy Bady (Zenith):
              "acted like a child, like rachael"
17:28:13      Stephen Johnson (Ally Vascular)  Showed  -> Cancelled
17:30:31      Amanda Joines (Champion Heart)   No Show -> Cancelled
17:31:09      Kent Houston (Texas Endovascular) No Show -> Cancelled
17:31:47      Victoria Martin King (Buffalo)   No Show -> Cancelled
17:32:53      Frank Deal (Georgia Endovascular) No Show -> Cancelled
```

Earlier legitimate-looking activity under `Ricardo Lopez`: 26 declines and 14 dismissals on Aug 28, 2 OON marks, 10 approvals on Aug 3. These still need a spot check — the Aug 28 declines used real reasons, but the same account is now untrusted.

Impact today:

- All 50 dismissed records are still `review_status = 'dismissed'`, which permanently hides them from both Review Queue views and every client portal. Several are not junk: Darla Sippos (Champion Heart) and Fay Wood (Texas Endovascular) were Confirmed; Walter Banks (Premier Vascular) was Pending; Leonard Stewart, Michael Giordano and Mike Wohlers (Naadi) were Confirmed.
- The 5 status flips wrote fake cancellation reasons ("Unhappy with Service / Experience", "Scheduling Conflict", "Other") onto real patients and very likely pushed `cancelled-portal` / `cancel-reason-*` / `do-not-reschedule` tags into GoHighLevel, driving client cancellation workflows for patients who had already Showed or No-Showed.
- The abusive note on Tommy Bady is `visibility = 'clinic'`, so Zenith staff can read it.

## Plan

1. **Lock the account first.** Confirm whether the login still exists in Supabase Auth; if it does, revoke roles, kill active sessions and disable it. Report back the final state.
2. **Reverse the 5 status flips.** Restore Stephen Johnson to Showed and the four others to No Show, clear the fabricated cancellation reasons, retract the cancellation tags from GoHighLevel for each contact, and add an internal note on each record explaining the correction.
3. **Delete the abusive note** on Tommy Bady and replace it with an internal audit note recording that an inappropriate clinic-visible note was removed.
4. **Un-dismiss the 50 records** back to their prior review state so nothing is silently hidden from clinics, then re-triage. Records that were genuinely test/junk can be re-dismissed deliberately; the Confirmed and Pending ones must return to the working queue.
5. **Review the Aug 3 and Aug 28 actions** by the same account (10 approvals, 26 declines, 14 dismissals, 2 OON marks) and flag anything whose reason does not match the record.
6. **Add guardrails** so a single account cannot repeat this: rate-limit bulk Review Queue dismissals (e.g. a confirmation step plus a Slack alert past ~10 dismissals in 10 minutes), alert on profile display-name changes, and block clinic-visible free-text notes from users whose account is under review.

## Technical detail

- Data repairs run as SQL against `all_appointments` and `appointment_notes`, with GHL tag retraction through the existing `update-ghl-contact-tags` function using each project's `ghl_api_key`.
- Account lockdown touches `auth.users`, `user_roles`, `user_sessions` and `project_user_access`.
- Guardrails: dismissal throttle and Slack alert in `src/components/admin/ReviewQueue.tsx` plus a new lightweight edge notification; profile-name-change auditing via a trigger on `public.profiles` writing to `security_audit_log`.
- Everything is logged to `audit_logs` / `security_audit_log` so the remediation itself stays auditable for HIPAA purposes.
