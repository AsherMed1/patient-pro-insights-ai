## Verified current state

Contact `J4bdMPfshldJPLSaoYRI` (Naadi Healthcare) has two rows:

| Row | Calendar | Status | Review status |
|---|---|---|---|
| `d5798107` — "Ron Martinez" | Request your Neuropathy Consultation - Manteca | Cancelled | approved |
| `442868db` — "Ronald Martinez" | Request your GAE Consultation - Manteca | Confirmed | **pending** (sitting in Review Queue) |

`442868db` is the row I created via the GHL backfill last turn. It's the one showing in the Review Queue as Neuropathy / GAE Consultation - Manteca, Jul 27 2026 8:30 AM.

## Plan

1. **Remove `442868db` from the Review Queue** — delete the row outright, so nothing lingers in either the queue or the client portal.
2. **Leave `d5798107` untouched** — the Cancelled Neuropathy row stays visible in the portal exactly as it is, for the ongoing investigation.
3. **No parser change, no backfill sweep** — the calendar-vs-procedure mismatch and the missing-webhook question stay open for the follow-up investigation.

## Technical notes

Single data operation against `all_appointments`. Deletion (rather than declining) avoids leaving a frozen declined snapshot that would block a legitimate future GHL sync for appointment `JBIV9sXoeER4sszNYOui` if it does eventually arrive on its own.
