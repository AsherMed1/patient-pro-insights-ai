# Connect Claude to the Portal Database via Supabase MCP

Goal: let internal staff use Claude (Desktop or claude.ai) to read live portal data — appointments, QA cases, leads, reporting tables — through Supabase's official MCP server.

Note on hosting: this project runs on your own Supabase instance, so Lovable cannot deploy an app-hosted MCP server here. Supabase's own MCP server is the right route and needs no app code.

## What this gives you

- Claude can list tables, inspect schema, and run read-only SQL against the portal database.
- Full record access, including patient identifiers, per your decision.
- Each staff member connects with their own Supabase personal access token, so activity is attributable.

## Compliance guardrails (important)

Full-record access means PHI leaves the portal and enters Claude. Before rollout:

- Confirm Anthropic coverage: a BAA with Anthropic (available on Enterprise/commercial plans) is required for PHI. Consumer Claude plans are not HIPAA-covered.
- Restrict to named internal staff only — no clinic users, no shared tokens.
- Every connection must be read-only. Writes stay in the portal so triggers, audit logs, and status side-effects are never bypassed.
- Document the access in your HIPAA policy set: who has tokens, what they can read, and how tokens get revoked on offboarding.

If a BAA is not in place yet, run the pilot against a de-identified view set first (see Optional hardening).

## Setup steps

1. Create a dedicated Supabase organization access setup:
   - In the Supabase dashboard, each staff member creates their own Personal Access Token (Account > Access Tokens), named e.g. `claude-mcp-<name>`.
   - Tokens are secrets: they go only into that person's local Claude MCP config, never into the repo, chat, or shared docs.
2. Configure the MCP server in Claude, scoped to this project and read-only:
   - Server: Supabase's hosted MCP server.
   - Project ref: `bhabbokbhnqioykjimix`.
   - Flags: read-only mode enabled, project scoped (no org-wide access), and only the database/docs feature groups enabled — not branching, storage writes, or edge function deployment.
3. Verify from Claude:
   - List tables and confirm `all_appointments`, `qa_cases`, `new_leads`, `projects` are visible.
   - Run a read query (e.g. appointment counts by project for last 30 days).
   - Attempt a write (e.g. `update all_appointments set status='Showed'`) and confirm it is rejected.
4. Roll out to the named staff list, one token each, and record the list of who has access.

## Optional hardening (recommended)

- **Dedicated read-only DB role + views**: create a `claude_reader` Postgres role with `SELECT`-only grants, plus a small set of reporting views (e.g. appointment summary, QA case summary, recapture funnel) instead of raw table access. Claude queries the views; ad-hoc raw-table reads stay available to admins only.
- **De-identified view layer**: parallel views that mask name, DOB, phone, email, and insurance IDs, for anyone without BAA-covered access.
- **Token rotation**: quarterly rotation and immediate revocation on role change or offboarding.

## Technical details

- No changes to app code, edge functions, or the React frontend — this is Supabase + Claude configuration.
- Existing RLS policies do not constrain the MCP server: it authenticates at the project level, so read-only mode and the optional `claude_reader` role are the real access boundary.
- If we do the hardening step, it lands as one migration creating the role, grants, and reporting/de-identified views. Nothing in the portal UI changes.
- Audit trail lives in Supabase logs; portal `hipaa_audit_log` will not capture Claude reads, so note that gap in your policy or route staff through the views so queries are at least shaped and reviewable.
