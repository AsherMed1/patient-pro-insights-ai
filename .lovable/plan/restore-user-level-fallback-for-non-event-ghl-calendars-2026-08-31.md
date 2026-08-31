# Restore User-Level Fallback for Non-Event GHL Calendars

## Why the Slack alert fired

GHL's `calendars/events/block-slots` endpoint accepts a bare `calendarId` only for **event-type** calendars. "Request Your PFE Consultation at Houston (Bellaire)" is a round-robin/service calendar, so GHL replied `400 The calendar is not an event calendar`. Since the Aug 28 change removed the user-level fallback, the function now hard-fails: no GHL block, no local reservation, Slack alert. That is working as designed — but it leaves those calendars unblockable.

## Change

In `supabase/functions/create-ghl-appointment/index.ts`, when the calendar-level attempt fails **specifically because the calendar is not an event calendar**, fall back to per-user blocks instead of failing.

1. **Detect the fallback case.** Only when GHL returns HTTP 400/422 and the error text matches "not an event calendar". Any other GHL error keeps today's hard-fail + Slack alert behavior.
2. **Resolve the team members.** Fetch the calendar detail (`/calendars/{id}`) and read its `teamMembers[].userId`. If empty, fall back to the location's users (`/users/?locationId=`). No users found → hard-fail with the existing Slack alert.
3. **Create one block per user** by re-posting to `block-slots` with `assignedUserId` (no `calendarId`), collecting every returned block ID into `allBlockIds`. `ghlAppointmentId` is the first ID (keeps the local record and rollback path working — rollback already loops `allBlockIds`).
4. **Partial failure = full failure.** If some per-user blocks succeed and others fail, delete the successful ones via the existing `deleteGhlBlock`, then hard-fail with the Slack alert so we never leave a half-blocked slot.
5. **Slack informational notice** on a successful fallback (same `SLACK_CALENDAR_UPDATES_WEBHOOK_URL`): clinic, calendar, window, who reserved it, and "blocked N team members — calendar is round-robin/service, not event type". Non-blocking.
6. **Audit rows** in `security_audit_log`: `block_created_user_level_fallback` on success (with the user IDs and block IDs), keeping `block_creation_failed_calendar_level` for real failures.
7. **Success response** gains `block_level: 'calendar' | 'user'` and `team_members_blocked`, and the message reflects which path ran so the dialog toast can say "Reserved (blocked N providers)".

## Notes

- The existing overlap/capacity guard, Carve Around logic, and the local `all_appointments` reserved-block row are untouched.
- Persistent memory currently says user-level blocks are prohibited; that note gets updated to reflect this narrow, GHL-forced exception.

## Verification

- Re-run the Texas Endovascular PFE Houston (Bellaire) window: expect the reservation to save, per-user blocks to appear in GHL, and an informational Slack message rather than a failure alert.
- Re-run a normal event calendar block: unchanged single calendar-level block, no Slack message.
