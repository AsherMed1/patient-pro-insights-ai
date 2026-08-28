# Force Calendar-Level Reserved Blocks with Slack Failure Alert

Reserved time blocks currently try a calendar-level GHL block first, then silently fall back to blocking every team member individually for round-robin/service calendars. This change removes that fallback: blocks are always created at the calendar level, and any failure triggers a Slack alert instead of a workaround.

## Changes

### 1. Remove the user-level fallback (`create-ghl-appointment` edge function)
- Delete the team-member fallback path: no more fetching calendar team members / location users, no more per-user `assignedUserId` block creation.
- Keep the calendar details fetch only where it is still needed for the overlap/capacity guard (`appointmentPerSlot`).
- If the calendar-level `block-slots` call fails (or returns no block ID), the function treats the block as failed: no local reservation record is created and the caller gets a clear error (`success: false`, `code: 'CALENDAR_LEVEL_BLOCK_FAILED'`) with the GHL error detail.
- The `ReserveTimeBlockDialog` already surfaces function errors as a toast, so staff will see the failure immediately.

### 2. Slack alert on failure
- Reuse the existing `SLACK_CALENDAR_UPDATES_WEBHOOK_URL` secret (same calendar-updates channel used by `notify-calendar-update`) — no new secret or migration needed.
- On failure, POST a Slack message with: clinic (project name), calendar name, date/time range, who attempted the block, and the GHL error response, labeled clearly as a failed reserved-time-block alert so the team can fix the calendar configuration in GHL.
- Slack notification failure is non-blocking (logged only) so it never masks the real error returned to the user.
- Also log the failure to `security_audit_log` (`block_creation_failed_calendar_level`) for an audit trail.

### 3. Response/message cleanup
- Remove `team_members_blocked` / multi-block messaging from the success response; success always means exactly one calendar-level block.
- Rollback logic (`deleteGhlBlock`) stays as-is for local-insert failures.

## Out of scope
- No changes to the overlap guard, Carve Around, or the Slack calendar-update success notifications.
- No UI changes beyond the error message already surfaced by the existing toast.

## Verification
- Deploy the single edge function, then test: (a) block on an event-style calendar succeeds and appears in GHL; (b) block on a round-robin calendar that previously used the fallback now returns an error toast and posts the Slack alert to the calendar-updates channel.
