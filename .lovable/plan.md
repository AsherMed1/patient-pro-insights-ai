# Update to Requestor — QA Operations Queue

Below is a draft you can send to the requestor summarizing what shipped in the PatientPro Portal for the centralized QA Operations Queue.

---

**Subject:** QA Operations Queue — Ready for Review

Hi [Requestor],

The centralized QA Operations Queue is now live in the PatientPro Portal. Here's a full breakdown of what was built against your original spec.

**1. Dedicated Workspace for Quality Specialists**
- A new **QA Operations** tab is available in the portal for Admins, Agents, and users assigned the new `qa_specialist` role.
- Users with `qa_specialist` role see a stripped-down, standalone layout focused only on the QA queue — no distractions from other portal tabs.
- Access is project-scoped: QA Specialists only see cases for the projects/clinics they are assigned to.

**2. Case Lifecycle (Workflow Statuses)**
Cases move through the exact four statuses you requested:
- **New** — freshly ingested, not yet triaged
- **In Review** — a QA Specialist has taken ownership and is investigating
- **Pending / Escalated** — waiting on another team, clinic, or leadership
- **Completed** — resolved and closed out

Each status has its own tab with counts, plus search and filters (project, date range, keyword) across the queue.

**3. Automatic Case Ingestion**
Cases now flow into the queue automatically — no manual creation required — from three triggers:
- **Short-notice alerts** (appointments booked inside the clinic's short-notice window)
- **OON (Out of Network)** status changes on any appointment
- **Cancelled / No Show** transitions where the appointment had previously been Confirmed (i.e. a confirmed patient who fell off)

Every ingested case carries the appointment context (patient, project, appointment date, reason for entry) so the specialist has everything they need to investigate.

**4. Case Detail Drawer**
Clicking any case opens a side drawer with:
- Full patient + appointment context
- **Notes thread** — QA Specialists can add investigation notes, threaded chronologically
- **Activity log** — every status change, assignment, and note is timestamped and attributed to the user who made it
- Status controls to move the case through the workflow
- One-click link back to the underlying appointment record

**5. ControlHub Ticket Creation**
Directly from a case, a specialist can click **Create ControlHub Ticket** and a ticket is created with the case context pre-filled. This runs through a dedicated backend function and supports two modes:
- **Stub mode** (default today) — records the ticket intent in the case activity log so nothing is lost
- **Live mode** — when the ControlHub API credentials are provided, tickets are pushed to ControlHub in real time and the returned ticket ID is stored on the case

To flip on live mode we just need the ControlHub API endpoint + API key added as secrets. Let me know and I'll wire them in.

**6. Auditability & Security**
- All case activity (creation, status changes, notes, ticket creation) is stored with user attribution and timestamps.
- Row-Level Security ensures QA Specialists only see cases for their assigned projects; Admins/Agents see everything.
- The `qa_specialist` role is separate from Admin/Agent, so you can grant QA access without granting portal-wide edit rights.

**What's Needed From You to Go Live**
1. Tell me which users should get the `qa_specialist` role, and which projects each should be scoped to — I'll assign them.
2. (Optional but recommended) Provide the ControlHub API endpoint + API key so tickets flow live instead of stub mode.

Happy to jump on a quick walkthrough once you've had a chance to poke around. Let me know if you'd like any of the ingestion triggers tuned (e.g. additional statuses that should auto-create a case) or additional filters in the queue.

Thanks,
[Your Name]

---

Want me to adjust tone (more formal / more casual), shorten it, or add screenshots of the new tab before you send?
