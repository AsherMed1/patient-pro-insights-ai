# Use the GHL "Please select your insurance provider" field to drive per-clinic supported insurances

## Why this works

Every GHL sub-account has that custom field, and its dropdown options are exactly the list of insurers the clinic accepts. Verified: 50 of 55 projects already have a GHL API key + location ID stored, and `fetch-ghl-contact-data` already calls `GET /locations/{id}/customFields` — the same call returns each field's picklist options, so the accepted-insurance list can be pulled per clinic with no new credentials.

Today the OON safeguard only knows about explicit block rules (`insurance_block_rules`, currently empty). This turns the problem inside out: instead of maintaining a denylist per clinic by hand, each clinic gets an allowlist synced from its own GHL dropdown.

## What to build

### 1. Store the per-clinic list
New table `clinic_supported_insurances`: project, raw option text as it appears in GHL, a normalized form, optional link to a canonical plan, `source` ('ghl' or 'manual'), `active`, `last_synced_at`. Unique on (project, normalized). Admin-only RLS plus the standard grants.

### 2. Sync function
New edge function `sync-ghl-insurance-options`:
- Loops clinics that have GHL credentials (or one clinic when given a `project_id`).
- Fetches location custom fields, finds the field whose name matches "please select your insurance provider" (fuzzy, so per-clinic wording variations still match).
- Reads its picklist options, normalizes them with the same normalizer the OON matcher uses, and upserts them.
- Options that vanish from GHL get marked inactive rather than deleted, so history is kept.
- Auto-links each option to a canonical plan when an existing alias matches; otherwise leaves it unlinked for review.

### 3. Admin UI
In Insurance Rules, add a **Supported insurances** section:
- Clinic picker, list of synced options with their canonical-plan link and last-synced timestamp.
- "Sync from GHL" per clinic and "Sync all".
- Ability to add/remove a manual entry, and to attach an unlinked option to a canonical plan (which creates the alias).
- Flags clinics that have no credentials or where the field wasn't found.

### 4. Wire into the OON safeguard (opt-in per clinic)
Add an `oon_mode` setting per clinic: `denylist` (today's behaviour, default) or `allowlist`.
In allowlist mode, `evaluate-potential-oon` flags a record as potential OON when the patient's stated insurer does **not** normalize to any active supported entry for that clinic. Existing block rules still apply on top. An empty or unreadable insurance value is never auto-flagged by allowlist mode alone — that stays a data-quality issue, not an OON one.

Routing after a flag is unchanged: patient-submitted goes to the Review Queue with an approval block, setter-submitted goes to QA hold plus Slack.

## Rollout

1. Ship the table, sync function, and admin UI; run a full sync and review what comes back per clinic.
2. Leave every clinic on `denylist` initially so nothing changes in production.
3. Turn `allowlist` on for one or two clinics whose synced list looks clean, watch the flag volume, then expand.

## Notes / open items

- Some clinics may have generic options like "Other" or "I'm not sure" in the dropdown — those should be treated as "unknown", not as an accepted insurer. The sync will mark them as non-matching so they don't silently whitelist everything.
- The 5 clinics without GHL credentials can't be synced; they show a warning and stay on manual entry.
- Re-sync can run on a schedule later; the first version is manual-button only.
