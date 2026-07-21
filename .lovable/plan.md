## Goal
Ensure ControlHub tickets created from the PatientPro QA Operations Queue route correctly:
- `issue_type: "tech"` → Tech Tickets section
- `issue_type: "va"` → VA Requests / VA Submissions section (visible to Dean for triage/assignment)
- No VA tickets leaking into Tech Tickets

## Current state (verified)

`supabase/functions/create-controlhub-ticket/index.ts` already:
- Validates `issue_type` is `"va"` or `"tech"` and forwards it to ControlHub's `receive-external-ticket` endpoint in the POST body.
- Prefixes the task name with "VA — " / "Tech — " on the UI side.

Two things are still wrong:

1. **Deep-link fallback (PatientPro side, line 139):** when ControlHub returns a URL without a `type` query param, we hard-code `type=tech`. VA tickets opened from PatientPro therefore land on the Tech Tickets view even when routing is fixed downstream.
2. **Routing itself (ControlHub side):** the actual "which section does this ticket appear in" logic lives in the ControlHub Lovable project — its `receive-external-ticket` edge function and the tables/views that back the Tech Tickets vs VA Requests screens. PatientPro cannot fix that on its own.

## Plan

### 1. PatientPro fix — deep-link uses the real ticket type

In `supabase/functions/create-controlhub-ticket/index.ts`, change the `type` fallback so it uses the ticket's actual `issue_type` instead of the hard-coded `'tech'`:

```
const ttype = u.searchParams.get('type') ?? normalizedIssueType;
```

That way a VA ticket without a `type` param in ControlHub's returned URL still opens on the VA view.

### 2. ControlHub-side changes (separate Lovable project — needs to be applied there, not here)

I'll hand you a ready-to-paste change list for the ControlHub project. The routing decision needs to happen where the ticket is stored and where the two sections read from:

- `receive-external-ticket` edge function: persist the incoming `issue_type` verbatim onto the ticket row (e.g. `tickets.issue_type`), no defaulting to `'tech'`. Reject payloads missing a valid `issue_type` instead of silently classifying them.
- Tech Tickets list query: `where issue_type = 'tech'`.
- VA Requests / VA Submissions list query: `where issue_type = 'va'`, visible to Dean (admin) plus whoever he assigns the ticket to.
- Ticket detail route: honor the `type` query param so `/admin?ticket=...&type=va` opens the VA detail view and `type=tech` opens the Tech detail view. Do not fall back to Tech.
- One-off backfill: any existing tickets created from PatientPro that landed under Tech but have `issue_type = 'va'` (or blank + task name starting with "VA —") should be moved to `issue_type = 'va'` so Dean can find them.

### 3. Verify end-to-end

From the QA Operations Queue in PatientPro:
- Create a VA ticket → confirm it appears only in ControlHub's VA Requests section, not Tech Tickets, and the returned link opens the VA detail view.
- Create a Tech ticket → confirm it appears only in Tech Tickets.
- Confirm Dean can see and reassign VA tickets.

## Notes for the non-technical reader
The PatientPro side of this fix is a one-line change to the ticket-opening link so VA tickets stop being forced onto the Tech view. The bigger routing fix — actually storing and listing tickets by type in ControlHub — has to be done in the ControlHub project itself, because that's where the Tech Tickets and VA Requests screens live. I'll write those ControlHub instructions for you to apply there.
