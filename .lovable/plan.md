## Goal

In the QA Operations Queue, collapse every alert for the same patient (GHL contact) into a single row. The row shows all alert types, uses the most recent alert's bucket, and lets the QA team review/resolve each underlying alert from one drawer.

## Scope

Frontend-only changes to `src/components/admin/QAOperationsQueue.tsx`. No schema changes, no changes to how alerts are ingested — the underlying `qa_cases` rows stay one-per-alert so history, timestamps, and per-alert audit fields remain intact.

## Grouping rules

- **Grouping key:** `ghl_contact_id` when present; fallback key `project_name + normalized(patient_name) + appointment_id` for rows missing a contact ID (so orphans don't all collapse into one bucket).
- **Row identity in the table:** the single case with the newest `last_alert_activity_at` inside the group is the "primary" and drives Patient, Clinic, Service, Latest Alert timestamp, Ticket, and Open action.
- **Bucket placement (Latest alert wins):** the row appears in the bucket matching the primary case's `workflow_status`. Bucket counts (New / In Review / Pending / Completed / All) are derived from primary cases only, after search/filter.
- **Date Created:** earliest `first_entered_at` across the group. **Latest Alert:** newest `last_alert_activity_at`.

## Row display

- **Alert column:** stacked chips, one per distinct `alert_type` in the group, each colored as today. Chip tooltip shows that alert's own workflow status + last activity time.
- **Self-Booked / Error / Error Source / Resolution / Resolved:** show the primary case's value; when children disagree, append a small "+N more" hint that reveals per-alert values in the drawer.
- **Ticket:** show any linked ControlHub ticket across the group (first non-null).
- Search still matches against any child case's name, project, service, or ticket, and the row surfaces if any child matches. Auto-tab-switch behavior is preserved.

## Drawer (Open) changes

- Header stays patient-centric (name, project, GHL link).
- New **Alerts in this record** section at the top of the drawer: one collapsible card per child case, ordered newest first, each showing alert type, workflow status, entered/latest/completed timestamps, and inline actions (status change, assign QA, audit fields, resolution type, ticket create) — the same controls that exist today, scoped to that child case.
- Notes and Activity tabs merge entries from every child case, tagged with the alert type they belong to, sorted by time. Adding a note prompts which alert it applies to (defaults to the primary).
- "Create ControlHub Ticket" defaults to the primary alert; user can pick which alert to attach it to.

## Realtime + filters

- Existing realtime subscription on `qa_cases` still drives refresh; grouping is recomputed client-side after each fetch.
- Project / alert-type / assignment / date filters run against child cases first; a group is included when any child matches, and the row's displayed primary is the newest matching child.

## Non-goals

- No DB schema migration, no changes to ingest triggers (`qa_ingest_*`), no changes to Review Queue module.
- No auto-resolve cascade: resolving one alert does not resolve siblings; the row only leaves the active buckets when every child is `completed`.

## Technical notes

- Add a `groupCases(cases: QACase[])` helper returning `{ key, primary, children, alertTypes, ticket, earliestCreated, latestActivity }[]`.
- Replace the current `filteredCases` table map with `groupedRows` derived from `filteredCases`.
- Bucket count memo switches from counting cases to counting groups keyed by `primary.workflow_status`.
- Drawer state changes from `selectedCase: QACase` to `selectedGroup: Group` with an internal `activeChildId` for the currently-focused alert card.
