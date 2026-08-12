---
name: Pending Review safeguards & Short Notice countdown
description: Short Notice records cannot enter Pending Review; Pending rows show countdown, age, last contact, and 24-business-hour follow-up warning
type: feature
---
- Short Notice records (existing unresolved `short_notice_alerts` row, or already inside the clinic's `projects.short_notice_threshold_hours` window) can never be moved into Pending Review. Per-row button is disabled; bulk move skips them and reports how many were skipped.
- Pending rows show a live countdown "Short Notice in 1d 6h" (business hours, clinic timezone), turning red under 12h.
- Pending rows also show: Pending age + who moved it (`all_appointments.pending_since` / `pending_by` / `pending_by_name`), last patient contact attempt (most recent human-authored `appointment_notes` row — system notes filtered by `isSystemNote`), and an amber "Needs follow-up" badge after 24 business hours with no contact.
- Pending view sorts by urgency (already Short Notice first, then closest to threshold).
- Edge function `sweep-short-notice-pending` runs every 15 min via pg_cron: auto-creates the Short Notice alert + Slack notification for Pending records crossing the threshold and stamps `short_notice_auto_tagged_at`. Records stay in Pending but flagged.
- Shared math lives in `src/lib/shortNotice.ts` and is mirrored in the edge functions.
