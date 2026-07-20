# Ann Layendecker — Why the portal didn't auto-sync to Cancelled

## What actually happened on this record

Appointment `d6b13599…` (Ann Layendecker, Liberty Joint & Vascular). Note timeline:

1. `2026-07-02 19:31` — Maria (portal user) flipped Confirmed → **Welcome Call**.
2. `2026-07-14 11:52:50` — GHL-driven cancellation reason note arrived (System).
3. `2026-07-14 11:52:51` — **Natalie manually** flipped Welcome Call → **Cancelled** in the portal.

So the current "Cancelled" state is from Natalie's manual click, not from GHL sync. **No GHL setup is missing on the clinic side** — GHL did send the update, but the portal ignored the status change.

## Root cause

`supabase/functions/ghl-webhook-handler/index.ts` line 1356 treats **Welcome Call as a "portal-only terminal status"** and refuses to overwrite it from any GHL webhook:

```ts
const portalOnlyStatuses = ['oon', 'do not call', 'cancelled', 'canceled', 'welcome call']
```

That guard is correct for OON / Do Not Call / Cancelled (portal-only terminal per Core rules), but **Welcome Call is not terminal** — it's a mid-flow portal state. Because it's in this list, any GHL status update (including a real Cancellation) is silently dropped whenever the portal is currently on Welcome Call. That's the tech ticket the clinic reported.

## Fix

Remove **only** `'welcome call'` from the `portalOnlyStatuses` guard at line 1356 in `ghl-webhook-handler/index.ts`.

Effects, verified against surrounding code:

- Real portal-only terminals (OON, Do Not Call, Cancelled) remain protected from GHL echo-back.
- GHL-driven status changes from Welcome Call now flow through and already trigger the existing `welcomeCallTransitionNote` audit note (lines 1364–1369) so the transition is visible in the appointment history with attribution to the GHL sync.
- No change to `update-appointment-status`, portal UI, or Welcome Call dropdown-gating logic. Only the inbound GHL sync path changes.

## What to tell the clinic

Nothing to configure in GHL. GHL cancellation already flows to the portal for all statuses except Welcome Call, and this fix closes that gap. Going forward, cancelling in GHL while the portal is on Welcome Call will automatically move the portal to Cancelled and log a status-change note.

## Technical details

- File: `supabase/functions/ghl-webhook-handler/index.ts`
- Single-line edit at line 1356; the `welcomeCallTransitionNote` branch that follows already handles the audit trail.
- No DB migration, no UI change, no memory update needed (the "portal-only terminal" list in Core memory already omits Welcome Call — code was stricter than policy).
