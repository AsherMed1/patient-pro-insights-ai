# Fix Ross Becker (ECCO Medical) blank record + stub intake notes

## What's actually wrong

Ross Becker's record (created Aug 15, ECCO Medical, GHL contact `6Imp…tkdR`) has only a 198-character intake note:

```text
**Contact:** address: 9313 Rogers Road | city: Longmont | state: Colorado | zip: 80503
**Insurance:** insurance_id_link: https://services.leadconnectorhq.com/...
```

The full `=== GHL Contact Data (Full) ===` block was never written, so the parser had nothing to work with: `parsed_pathology_info` and `parsed_insurance_info` are both empty objects, and `calendar_name` is null — which is why no service (GAE / PFE) can be determined. Every other recent ECCO lead has 1,500–4,800 characters of notes and a resolved procedure, so this is a one-off stub, not an ECCO-wide problem.

Cause: the booking webhook fired before the intake form was attached to the GHL contact, so only the thin fallback block was stored and no later payload replaced it.

A recovery function for exactly this case already exists (`recover-stub-intake-notes`) but it is not scheduled — it only ever ran manually, so stubs created afterwards stay blank forever.

## Fix

1. Re-pull Ross Becker's full GHL contact and rebuild his intake notes, then re-run the intake parser so demographics, pathology, insurance and the service/procedure populate. If GHL still has no intake answers for this contact, the record will show contact + insurance card only and we flag it for manual service selection rather than guessing.
2. Sweep the remaining stubs. There are 15 total across all projects in the last 90 days (ECCO 1, Emage 1, Georgia Endovascular 1, Horizon 1, Rao 1, VES 1, Champion 1, Vivid 1, plus 8 in test accounts) — run the same recovery for all of them.
3. Schedule `recover-stub-intake-notes` on an hourly cron (small batch, notes < 300 chars, GHL contact id present, last 30 days) so a webhook that lands ahead of the intake form self-heals within the hour instead of surfacing to the clinic as a blank record.

## Technical notes

- Recovery path: `recover-stub-intake-notes` (already deployed) → per-record GHL contact fetch → rebuild notes at the `=== GHL Contact Data (Full) ===` marker → null the parse timestamp → `auto-parse-intake-notes` reruns.
- Cron via `cron.schedule` + `net.http_post`, matching the existing `sweep-short-notice-pending` job pattern; body `{"limit": 50, "max_notes_length": 300}`.
- Guardrail: recovery only replaces the GHL-data block and never clears clinic-entered values.
- Procedure/service stays derived from calendar name first, then pathology notes — no change to detection logic here.

## Verification

- Open Ross Becker in the ECCO portal: contact card, insurance and pathology populated, service shown (or explicitly flagged as unknown if GHL truly has no intake data).
- Re-run the stub query and confirm the count drops to zero for live projects.
