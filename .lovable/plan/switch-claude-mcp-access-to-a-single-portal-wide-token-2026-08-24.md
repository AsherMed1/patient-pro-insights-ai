# Switch Claude MCP Access to a Single Portal-Wide Token

Replace the per-staff-token setup with one shared, portal-wide read-only credential that
every internal user's Claude connection uses.

## What changes

- One Supabase personal access token is created for the portal (not one per person),
  named `claude-mcp-portal`, held by an admin.
- Every staff member's Claude MCP config uses that same token and the same read-only,
  project-scoped flags.
- The setup doc drops the "each staff member creates their own token" step and gains a
  shared-token distribution and rotation procedure.

## The tradeoff, stated plainly

A shared token removes per-person attribution. Supabase project logs will show that a
query happened, but not who ran it. For a system holding PHI, that weakens the audit
story, so the plan pairs the shared token with two compensating controls:

1. **Curated views instead of raw tables** — a `claude_reader` role with `SELECT` only on
   a small set of reporting views. Queries are shaped and reviewable even without knowing
   the individual, and no one can pull arbitrary PHI columns ad hoc.
2. **Faster rotation** — monthly rotation, plus immediate rotation whenever anyone with the
   token leaves or changes role (with a per-user token you only revoke one; with a shared
   token, every departure means a full rotation and redistribution).

If per-person attribution is an audit requirement for you, the shared token will not
satisfy it and we should keep per-user tokens for anyone with PHI-level access.

## Work to do

### 1. Update `docs/claude-mcp-setup.md`

- Replace section 2 (per-user token creation) with a shared-token section: admin creates
  `claude-mcp-portal` once, distributes it only through your password manager (never chat,
  email, or the repo), and maintains a roster of who has received it.
- Update section 6 ops: monthly rotation cadence, rotate-on-departure rule, and how to
  redistribute after rotation.
- Update the audit-gap note to say explicitly that MCP queries are attributable to the
  portal, not to an individual.
- Keep the config block, verification checks, and compliance gate as-is — the flags and
  read-only requirement do not change.

### 2. Store the shared token as a project secret

Save the token as `CLAUDE_MCP_PORTAL_TOKEN` in the project's secret store so there is one
system of record for the current value and rotation does not depend on someone's notes.
It is not read by any app code — storage only.

### 3. Ship the `claude_reader` hardening (now required, not optional)

One migration creating:

- A `claude_reader` Postgres role with `SELECT`-only grants and no access to `auth` or
  `storage` schemas.
- Reporting views over existing data: appointment summary (project, status, dates, service
  line, review stage, short-notice flags), QA case summary, recapture funnel, and welcome
  call compliance.
- Views exclude superseded rows by default so query results match the portal.

No portal UI changes and no changes to app behaviour.

## Technical notes

- Supabase's MCP server authenticates at project level, so RLS does not constrain it; the
  `--read-only` flag plus the `claude_reader` grants remain the real access boundary.
- The token itself is a Supabase personal access token tied to an admin account — if that
  admin's Supabase access is removed, the shared token dies with it. Use a
  long-lived admin/service account rather than an individual's personal login.
- Rotation is a two-step: generate the new token in Supabase, update
  `CLAUDE_MCP_PORTAL_TOKEN`, then have staff paste the new value into their Claude config.
  Old token is revoked only after the new one is confirmed working.
