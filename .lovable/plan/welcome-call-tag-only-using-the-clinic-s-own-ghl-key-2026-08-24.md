# Welcome Call: tag-only, using the clinic's own GHL key

## What happened

The Welcome Call attempt saved correctly, but the GHL push failed. Confirmed from the data:

- Your test record (Test Johann For Trainee Review, Ally Vascular and Pain Centers) does have a linked GHL contact, and Ally Vascular does have its own GHL API key stored on the project.
- The Welcome Call function does not use that per-project key — it only reads the single global key from the environment. Every other GHL-writing function in the portal resolves the clinic's own key from the project first, then falls back to the global one. That mismatch is why the tag POST was rejected.
- The record is now sitting at "attempted" with no SMS timestamp, so it is safe to retry after the fix.

Also worth noting: the function already only pushes a tag — it never sends a text itself. So "just send a tag and handle it in GHL" is already the design; the wording in the portal is what made it look like the portal sends the SMS.

## Changes

1. **Resolve the clinic's GHL key.** In the Welcome Call function, look up the appointment's project and use that project's GHL API key, falling back to the global key only when the project has none. Same pattern the appointment/tag/DND functions already use.
2. **Return a real reason on failure.** Surface GHL's status and response text so a future failure names the cause (bad key, contact not found, tag rejected) instead of a generic message.
3. **Reframe the wording as tagging, not SMS.**
   - Success: "Attempt logged — patient tagged in GHL for Welcome Call follow-up."
   - Cooldown: "Attempt logged — patient was already tagged for follow-up in the last 12 hours."
   - Failure: "Attempt logged, but the GHL follow-up tag could not be applied." plus the reason.
   - Internal note text changes from "Welcome Call SMS triggered" to "Welcome Call follow-up tag applied in GHL (patient did not answer)."
4. **Keep the 12-hour cooldown** on repeat tagging so a GHL workflow can't be re-fired for the same patient the same day.

The tag stays `welcome-call-no-answer`, so whatever workflow you build in GHL against that tag owns the actual text message.

## Technical details

- `supabase/functions/trigger-welcome-call-sms/index.ts`: select `project_name` alongside the appointment row, look up `projects.ghl_api_key` by project name, use `projectKey ?? GHL_LOCATION_API_KEY`; on a non-OK tag response return the upstream status and body; update the two internal note strings.
- `src/components/appointments/WelcomeCallAttemptDialog.tsx`: update the three toast messages to tag wording and include the returned error detail in the failure toast.
- No schema change. `welcome_call_last_sms_at` keeps its name and continues to gate the cooldown.
