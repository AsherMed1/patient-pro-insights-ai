---
name: GHL Reserved Block Level
description: Reserved time blocks are calendar-level; user-level per-provider blocks are allowed ONLY when GHL replies "not an event calendar".
type: feature
---

`create-ghl-appointment` always tries a **calendar-level** GHL `block-slots` call first (`calendarId`, no `assignedUserId`).

Fallback rule (the only sanctioned one):
- If GHL returns 400/422 with "not an event calendar" (round-robin / service calendars), resolve the calendar's `teamMembers[].userId` (fallback: location users) and create one `assignedUserId` block per user.
- Partial failure = full failure: roll back any created blocks via `deleteGhlBlock` and hard-fail.
- Success posts an informational Slack message (`SLACK_CALENDAR_UPDATES_WEBHOOK_URL`) and a `block_created_user_level_fallback` row in `security_audit_log`. Response carries `block_level` and `team_members_blocked`.

Any other GHL error stays a hard failure: no local reservation row, `CALENDAR_LEVEL_BLOCK_FAILED` (502), Slack failure alert, `block_creation_failed_calendar_level` audit row.

Do NOT broaden the fallback to arbitrary GHL errors.
