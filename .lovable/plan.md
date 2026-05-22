## What I found

Dean Lunderstedt clicked OON on `Liberty Joint TEST` (id `8a817fab-...`) at **2026-05-21 21:43:59 UTC**.

Database side ran fine:
- `status = OON`, `review_status = oon`, `internal_process_complete = true`
- `appointment_review_history` row was written by Dean

But the two outbound side effects **never executed**:
- No `appointment-status-webhook` invocation in edge logs for that appointment around 21:40–21:50 → **GHL OON workflow did not fire**
- No `notify-slack-oon` invocation → **no Slack alert**

The ReviewQueue OON fix was committed at **21:33:10** — only 10 minutes before Dean's click. The most likely cause is that **Dean's browser was still running the pre-fix JS bundle** (the old code called the nonexistent `notify-slack-status-change` and never invoked `appointment-status-webhook`). The current code in `ReviewQueue.performAction` is correct; I verified by calling `appointment-status-webhook` directly for this appointment — it returned `success: true`.

There may also still be a stale `SLACK_OON_WEBHOOK_URL` (Slack returned 404 in the earlier Mary Braxton run). Need to confirm.

## Fix

### 1. Backfill Dean Lunderstedt TEST

Fire the two side effects manually for appointment `8a817fab-b431-... ` (Liberty Joint TEST):
- Invoke `appointment-status-webhook` with `{ appointment_id, old_status: 'Pending', new_status: 'OON' }` → triggers Liberty Joint's GHL OON workflow
- Invoke `notify-slack-oon` with the lead's name/phone/calendar/project → sends Slack alert

Also check the older Dean TEST row `ed5b02e3-...` (the 21:03 OON click) — same backfill if the user wants both.

### 2. Harden ReviewQueue.performAction against silent failure

Current behavior swallows errors from `notify-slack-oon` (try/catch warn) and `appointment-status-webhook` (`.catch` warn). When a stale bundle, network blip, or dead webhook drops the call, the queue still says "marked as OON" and the operator has no idea the workflow didn't run.

Changes in `src/components/admin/ReviewQueue.tsx`:
- `await` `appointment-status-webhook` (not fire-and-forget) and check the response. If it errors or returns non-success, show a destructive toast: "OON saved, but GHL workflow failed to fire — contact engineering."
- Same for `notify-slack-oon`: if it errors, surface a toast warning "Slack OON alert failed to deliver."
- Keep the DB update and review-history insert as-is — those already work. The toasts are warnings only; the row still leaves the queue.

### 3. Verify Slack webhook secret

Confirm `SLACK_OON_WEBHOOK_URL` is live. If still 404, ask the user to regenerate the Slack incoming webhook and update the secret. (Cannot test from plan mode.)

## Files to change

- `src/components/admin/ReviewQueue.tsx` — convert the OON side-effect block to awaited calls with surfaced toasts on failure.

No DB migration, no new edge functions.

## After approval

I will:
1. Apply the ReviewQueue.tsx change
2. Backfill Dean Lunderstedt TEST (`8a817fab-...`) by invoking `appointment-status-webhook` and `notify-slack-oon`
3. Check `notify-slack-oon` response to confirm whether `SLACK_OON_WEBHOOK_URL` is still alive; report back
