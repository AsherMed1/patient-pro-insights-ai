# Parse Health Monitoring — close the "missing info" gap

The fixes already shipped stop the known causes (null-clobbering, age brackets, AI outage fallback, trigger error). What's missing is a way to catch the *next* cause before a clinic reports it.

## What to build

### 1. Parse health flag on every appointment
Compute a completeness check when an appointment is written or parsed. A record is "incomplete" when any of these are empty despite intake notes existing:
- Demographics (name, DOB, age)
- Contact (phone or email)
- Insurance (provider or ID)
- Pathology / medical info

Store the result and the list of missing sections on the appointment row so it can be filtered and reported on.

### 2. Automatic re-parse sweep
A scheduled job runs every 30 minutes and re-parses records that are incomplete, still under the retry cap, and older than 10 minutes. This picks up anything that failed due to a transient AI outage without anyone noticing.

### 3. Admin visibility
- A "Parse Health" panel (admin-only) listing incomplete records grouped by clinic, with the missing sections shown and a one-click Re-parse action.
- Records that have exhausted retries are surfaced separately as "needs manual review" so they don't sit invisible.

### 4. Alerting
Daily Slack summary: count of incomplete records per clinic, plus an immediate alert if the AI parser fails more than a threshold number of times in an hour (catches credit exhaustion / provider outage on day one instead of day five).

## Technical notes

- Add `parse_health` (jsonb: `{ complete: bool, missing: text[], checked_at: timestamptz }`) to `all_appointments`; populate from `auto-parse-intake-notes` at the end of each parse and via a backfill for existing rows.
- The sweep reuses the existing `auto-parse-intake-notes` batch path with an `EdgeRuntime.waitUntil` batching pattern and the existing `parse_attempts < 5` cap, scheduled via pg_cron.
- Failure-rate alerting reuses the lightweight Slack webhook pattern already used by `notify-slack-oon`.
- No changes to how parsed data is written — the merge-safe (`mergeNonNull`) behaviour stays as is, so clinic-entered data is never overwritten.
