---
name: Declined snapshots must never become invisible
description: Declined/dismissed Review Queue snapshots are only superseded after a replacement row is inserted, and the Declined tab shows superseded rows.
type: constraint
---
`findExistingAppointment` in `ghl-webhook-handler` must NOT supersede declined/dismissed snapshots inline. The caller skips inserts for terminal statuses (a GHL cancellation echo right after a portal decline), so retiring the snapshot with no replacement leaves the contact with zero visible rows — the patient disappears from every portal view (Narenthia Samuel, Emage Fibroid Centers, Aug 26 2026).

Rules:
- Snapshot IDs are stashed in `pendingSnapshotSupersede` (keyed by requestId) and only marked `is_superseded=true` **after** a replacement row is successfully inserted. Cleared on the terminal-status skip path.
- The Review Queue **Declined** bucket (list + badge count) intentionally includes `is_superseded=true` rows so a retired decline stays auditable. All other buckets still exclude superseded rows.
- `update-ghl-contact-tags` resolves the clinic's own `projects.ghl_api_key` from the contact when the caller omits it; the global `GHL_LOCATION_API_KEY` returns 401 "Invalid JWT" for other sub-accounts and silently drops the tag push.
