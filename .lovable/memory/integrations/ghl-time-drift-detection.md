---
name: GHL time drift detection (dual-reading rule)
description: sync-ghl-appointment-times must accept either the calendar wall clock or the project-timezone reading before declaring drift; reserved blocks excluded.
type: constraint
---
`sync-ghl-appointment-times` compares portal date/time against GHL `startTime` (e.g. `2026-08-18T13:00:00-04:00`). Two readings are legitimate:

1. the calendar's literal wall clock (from the offset in the string), and
2. the same instant converted into `projects.timezone`.

A row counts as drifted only when it matches **neither**. Several projects have a `timezone` that disagrees with their GHL calendar (e.g. Vascular Surgery Associates of Virginia is stored as `US/Central` but books Eastern), so a single-reading comparison produced false 1-hour "drift" and would have written wrong times into client-facing records.

Also: the sweep excludes `is_reserved_block = true` rows (manual calendar carve-outs have no meaningful GHL time parity) and rows with `is_superseded = true`.
