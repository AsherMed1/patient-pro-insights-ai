# Fix: GHL echo reverting Marie Lewis from "Welcome Call" back to "Showed"

## What actually happened (confirmed in the record)

Notes on Marie Lewis (Sep 11, 2026 PAD - Plano) show three events within four seconds on Aug 26:

```text
14:43:15  Mardiory Oloverio: Confirmed → Showed        (portal pushes "showed" to GHL)
14:43:16  Mardiory Oloverio: Confirmed → Welcome Call  (correction; portal-only, nothing pushed to GHL)
14:43:19  GoHighLevel: Welcome Call → Showed via GHL sync
```

The "GHL change" at 14:43:19 was not a clinic action in GoHighLevel — it is GoHighLevel echoing back the portal's *own* "Showed" push from three seconds earlier. Because Welcome Call has no GHL equivalent, the handler treats an incoming `showed` as a genuine forward move and overwrites it.

The existing Welcome Call guard only ignores `confirmed` / `booked` / `new` / `unconfirmed` restatements, so this echo slipped through. The record now sits at Showed instead of Welcome Call.

## The fix

Make the webhook handler able to recognise the portal's own outbound status pushes:

1. When the portal pushes a status to GoHighLevel (`update-ghl-appointment` path used by the canonical status-change function), stamp the appointment with the status that was pushed and the time it was pushed. The columns `last_ghl_sync_at` / `last_ghl_sync_status` / `last_sync_source` already exist on the appointment table and are currently unused — reuse them instead of adding schema.
2. In `ghl-webhook-handler`, before applying an incoming status: if the incoming status equals the last status the portal pushed, the push was under ~3 minutes ago, and the portal status has since changed to something else, treat it as an echo and skip the status write (log it, no misleading "via GHL sync" note).

Genuine GHL-driven changes (a status the portal never pushed, or the same status arriving later than the window) keep applying exactly as today.

## Cleanup for this record

Set Marie Lewis back to `Welcome Call`, and remove the incorrect `Status changed from "Welcome Call" to "Showed" via GHL sync` note plus the stray `Confirmed → Showed` mis-click note so the history reads correctly.

## Technical detail

- `src/utils/appointmentStatusChange.ts`: after a successful `update-ghl-appointment` invoke, write `last_ghl_sync_status = <pushed status>`, `last_ghl_sync_at = now()`, `last_sync_source = 'portal_status_push'`.
- `supabase/functions/ghl-webhook-handler/index.ts` (~line 2436-2460): add an `isPortalPushEcho` check alongside the existing `isWelcomeCallRestatement` branch; skip the status update and suppress the status-change note when it matches.
- No schema migration, no UI change.
