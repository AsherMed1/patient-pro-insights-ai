# Review Queue: "Short Notice" chip wording + timezone aliases

## What is actually happening with James O'Bannon

Verified against the record (Zenith Vascular & Fibroid Center, GHL contact `ieqHEC48FEVfMLoB4DNM`):

- Booked Aug 20 at 21:30 UTC for **Aug 26, 1:30 PM** — about **94 business hours** of notice at booking.
- Zenith's short-notice threshold is **36 hours**.
- There is **no row in `short_notice_alerts`** for this appointment, which is why nothing posted to `#client-portal-short-notice-appts`. That is correct — it was never short notice.

So Slack and GHL are both fine. The Review Queue is showing the neutral **countdown** chip, which today reads:

```text
Short Notice in 1d 13h
```

That chip is meant to say "this becomes short notice in 1d 13h", but because it leads with the words "Short Notice" it reads like the record already is one. Nothing is mis-flagged; the label is misleading.

## Fix 1 — reword the countdown chip

Only the neutral / pre-window state changes. Three states in the row badges:

| State | Label | Color |
| --- | --- | --- |
| Already inside the window | `Short Notice window` | Red |
| Under 24h until threshold | `Short notice in 6h` | Orange |
| More than 24h until threshold | `Becomes short notice in 1d 13h` | Neutral, no fill |

The alert-backed badge (`Short Notice · 14h`, red, driven by an actual `short_notice_alerts` row) is unchanged. Tooltip on the countdown stays "Time remaining before this appointment enters the clinic's short-notice window".

## Fix 2 — timezone aliases (real math bug found while checking)

The shared short-notice helper only recognises `America/*` timezone names. 30 of the 55 projects are stored as `US/Central`, `US/Eastern`, `US/Mountain` or `America/Louisville`, and all of those silently fall back to a fixed −6 offset. Right now that makes every Eastern clinic's countdown off by one to two hours, and Central clinics off by one hour during daylight saving.

Add an alias map so `US/Eastern` → `America/New_York`, `US/Central` → `America/Chicago`, `US/Mountain` → `America/Denver`, `US/Pacific` → `America/Los_Angeles`, `US/Arizona` → `America/Phoenix`, `US/Hawaii` → `Pacific/Honolulu`, `America/Louisville`/`America/Detroit`/`America/Indiana/Indianapolis` → `America/New_York`. Same map goes into the edge functions that mirror this math so backend alerting and the portal stay in agreement.

## Technical notes

- `src/lib/shortNotice.ts`: add `TZ_ALIASES` and resolve through it in `getTimezoneOffset`.
- `src/components/admin/ReviewQueue.tsx` (~lines 2338-2351): change the countdown label text; keep the existing 24h orange / above-24h neutral color split.
- `supabase/functions/sweep-short-notice-pending/index.ts` and `ghl-webhook-handler` short-notice block: same alias map so the sweep uses the correct offset.
- No schema, RLS, or alerting-behaviour changes. No appointment is newly flagged or unflagged by the wording change; the alias fix shifts countdowns by an hour or two for non-`America/*` clinics, which is the correct value.
