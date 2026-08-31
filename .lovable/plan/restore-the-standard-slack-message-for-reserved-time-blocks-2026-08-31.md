# Restore the standard Slack message for reserved time blocks

## What's happening now

When a reserved time block lands on a round-robin/service calendar, GHL rejects a calendar-level block and the function falls back to blocking each provider individually. That fallback path posts its own extra Slack message titled "Reserved Time Block created at USER level" with Clinic / Calendar / Reserved By / raw ISO Window plus a technical footnote.

The familiar "Calendar Update: Reserved Time Block" message (Clinic, Calendar, friendly Date, Blocked By, Time Blocked, Reason) is posted separately by the portal after a successful reservation, and it still fires on the fallback path too. So the channel currently gets the technical message in addition to — or instead of the look of — the normal one.

## Change

Remove the "created at USER level" Slack post from the reserved-block edge function so the only message in `calendar-updates` is the standard, human-readable "Calendar Update: Reserved Time Block" card — identical to the Elite Minimally Invasive Specialists example.

Everything else about the fallback stays exactly as-is:
- Per-provider blocks are still created when GHL says the calendar is not an event calendar.
- Partial failures still roll back and hard-fail.
- Real failures still post the "Reserved Time Block FAILED" Slack alert.
- The `block_created_user_level_fallback` row is still written to `security_audit_log`, so the user-level detail remains available for auditing without cluttering Slack.

## Technical detail

- File: `supabase/functions/create-ghl-appointment/index.ts` — delete the `postSlack({...})` call in the successful user-level fallback branch (the header "Reserved Time Block created at USER level" and its context line).
- No frontend change: `ReserveTimeBlockDialog.tsx` already invokes `notify-calendar-update`, which renders the desired format.
- Redeploy the `create-ghl-appointment` edge function.

## Verification

Reserve a block on a round-robin calendar (e.g. Texas Endovascular GAE Clear Lake) and confirm `calendar-updates` shows only the standard "Calendar Update: Reserved Time Block" message, while the block still appears for each provider in GHL.
