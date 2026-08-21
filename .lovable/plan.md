# Fix: Review Queue shows a false Short Notice countdown for some users

## Root cause (verified)

James O'Bannon, Zenith Vascular & Fibroid Center, Aug 26 at 1:30 PM, booked Aug 20 at 4:30 PM CT.

- Zenith's configured short-notice threshold is **36 business hours**. That booking had ~94 business hours of notice, so it is correctly **not** short notice and correctly produced **no `short_notice_alerts` row and no Slack post**. GHL is fine.
- The badge in the screenshot ("Short Notice in 20h 48m", orange) is the countdown chip. Reproducing the math: 20h 48m at the moment that screenshot was taken only comes out if the queue used a **72-hour** threshold, not Zenith's 36.
- Where the 72 comes from: the Review Queue loads each clinic's threshold and timezone by selecting from the `projects` table in the browser. When a project row does not come back, it silently falls back to `{ threshold: 72, timezone: 'America/Chicago' }`.
- Row-level security on `projects` only grants SELECT to **admin, agent, project_user (assigned only), and va**. The roles that actually work the Review Queue — `review_only`, `qa_specialist`, `trainer`, `recapture` — get **zero rows back**, so every row silently falls back to 72h Central.

Effect for those users: every countdown is wrong, clinics with a short threshold (18h, 24h, 36h) look like they are approaching or already inside a short-notice window that the backend never agrees with, and no Slack alert ever accompanies them. Admins see the correct value, which is why this looks inconsistent between people.

## Fix

1. **Give the queue roles read access to the short-notice config.** Add a SELECT policy on `projects` for `review_only`, `qa_specialist`, `trainer` and `recapture` (the same read the `va` role already has), so the countdown uses each clinic's real threshold and timezone.
2. **Stop the silent fallback.** When a project's config genuinely cannot be resolved, render **no** short-notice countdown for that row instead of inventing a 72h Central window. A missing config must never manufacture a Short Notice signal.
3. **Reword the countdown chip** so a record that is not short notice does not read like one:
   - inside the window: `Short Notice window` (red) — unchanged
   - under 24h to threshold: `Short notice in 6h` (orange)
   - over 24h: `Becomes short notice in 1d 12h` (neutral, no fill)
4. **Timezone aliases.** The shared helper only recognises `America/*` names, but 30 of the projects are stored as `US/Central`, `US/Eastern`, `US/Mountain` or `America/Louisville` and all silently fall back to a fixed −6 offset. Map those onto their `America/*` equivalents so Eastern and Mountain clinics stop being computed one to two hours off.

After the fix, James O'Bannon shows `Becomes short notice in 1d 12h` in neutral grey, matching Slack's silence.

## Technical notes

- Migration: `CREATE POLICY "Queue roles view projects" ON public.projects FOR SELECT TO authenticated USING (has_role(auth.uid(),'review_only') OR has_role(auth.uid(),'qa_specialist') OR has_role(auth.uid(),'trainer') OR has_role(auth.uid(),'recapture'));` plus `GRANT SELECT ON public.projects TO authenticated` if not already present. No data changes.
- `src/components/admin/ReviewQueue.tsx` (~lines 702-730): drop the `threshold: 72 / America/Chicago` fallback for unresolved projects; leave those entries out of `projectConfigs` so no countdown renders. Badge text change at ~lines 2338-2351, keeping the existing 24h orange / above-24h neutral split.
- `src/lib/shortNotice.ts`: add a `TZ_ALIASES` map (`US/Eastern`→`America/New_York`, `US/Central`→`America/Chicago`, `US/Mountain`→`America/Denver`, `US/Pacific`→`America/Los_Angeles`, `US/Arizona`→`America/Phoenix`, `US/Hawaii`→`Pacific/Honolulu`, `America/Louisville`/`America/Detroit`/`America/Indiana/Indianapolis`→`America/New_York`) resolved inside `getTimezoneOffset`.
- Mirror the same alias map in `supabase/functions/sweep-short-notice-pending/index.ts` and the short-notice block in `ghl-webhook-handler` so backend alerting and the portal agree.
- No change to when alerts fire or to Slack delivery.
