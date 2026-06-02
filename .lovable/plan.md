# TPC "New Tab" Investigation — Findings

All 4 patients are in **The Painless Center** project, on the new **PFE** (Plantar Fasciitis Embolization) calendars (Clifton / Tenafly / Douglaston).

## Per-patient status in the database

| Patient | Calendar | Status | review_status | IPC | Where it shows | Why |
|---|---|---|---|---|---|---|
| Felizardo Carlos | PAE — Douglaston | OON | oon | true | Completed/All | Status changed from Confirmed → OON by **Isis Curiel** on 6/1 23:54 UTC |
| Gerardina Carnemolla | PFE — Clifton | OON | oon | true | Completed/All | Status changed from Confirmed → OON by **Fares Samy** on 5/30 17:15 UTC |
| Joseph Fenezia | PFE — Clifton | Confirmed | approved | false | **New tab** ✅ | Meets New criteria; Mohsin confirmed it appears |
| Danialba Munoz | PFE — Tenafly | Confirmed | approved | false | **New tab** ✅ | Meets New criteria; Mohsin confirmed it appears |

## Root cause

There is **no system bug**. The "New" tab query (`AllAppointmentsManager.tsx` ~L462) is working correctly:
- Joseph & Danialba **are** in New tab — Mohsin already verified.
- Felizardo & Gerardina were **manually marked OON** by TPC team members (Isis Curiel, Fares Samy). Per the project's terminal-status rules, OON is terminal → IPC flips to true → appointment routes to Completed/All and disappears from New. That is the designed behavior.

So Marissa's hypothesis ("something happened when we added the new service line") is not supported. PFE leads are flowing into the portal normally — 25+ PFE appointments exist for TPC across the last 3 weeks, most routed correctly (Pending → Needs Review, Confirmed → New, terminal → Completed).

The likely real cause of the complaint: someone on the TPC side (or our QA team) marked these specific patients OON before the client checked the New tab, and the client interpreted "not in New" as a system failure.

## Recommended response to client

1. Confirm Joseph Fenezia & Danialba Munoz are visible in the **New** tab right now.
2. Explain Felizardo Carlos & Gerardina Carnemolla were moved to **Completed** because their status was changed to **OON** (by Isis Curiel on 6/1 and Fares Samy on 5/30 respectively). Share the audit-note timestamps if helpful.
3. New PFE service line is wired correctly — no code change required.

## Optional follow-ups (only if client wants them)

- Add a **portal-side notice** when a recently created appointment is moved to a terminal status within X hours, so the client sees a "moved to Completed" badge on their dashboard.
- Surface the **status-change author + timestamp** more prominently on the Completed tab card (it's currently only in the notes drawer).

Tell me if you want me to switch to build mode and implement either follow-up; otherwise this can be closed as "working as designed."
