# Connecting Claude to the Portal Database (Supabase MCP)

Read-only Claude access to the PatientPro Portal database via Supabase's official
hosted MCP server, using **one shared portal-wide token**. No app code is involved —
this is Supabase + Claude configuration.

Supabase project ref: `bhabbokbhnqioykjimix`

---

## 1. Compliance gate (do this first)

Full-record access means PHI leaves the portal and enters Claude.

- [ ] BAA in place with Anthropic (Enterprise / commercial plan). Consumer Claude plans are **not** HIPAA-covered.
- [ ] Access limited to named internal staff. No clinic users.
- [ ] Every connection is read-only — all writes stay in the portal so triggers,
      audit logs, and status side-effects are never bypassed.
- [ ] Access recorded in the HIPAA policy set: who holds the shared token, what it can read,
      and the rotation trigger when someone leaves.

### Known limitation of the shared-token model

A single portal-wide token means **queries are attributable to the portal, not to an
individual**. Supabase project logs show that a query ran, not who ran it. If per-person
attribution is an audit requirement, this model does not satisfy it and PHI-level users
need their own tokens instead.

Two compensating controls are in place:

1. **Curated views instead of raw tables** — the `claude_reader` role can only read four
   reporting views (section 5). Nobody can pull arbitrary PHI columns ad hoc.
2. **Faster rotation** — monthly, plus immediately whenever anyone holding the token
   leaves or changes role (section 6).

---

## 2. Create the shared portal token (admin, once)

1. Sign in to Supabase as a **long-lived admin/service account**, not an individual's
   personal login — if that account loses project access, the shared token dies with it.
2. Dashboard → account menu → **Access Tokens** → **Generate new token**.
3. Name it `claude-mcp-portal`.
4. Store the value in two places and nowhere else:
   - Your password manager, in a vault shared only with approved staff.
   - The project secret store as `CLAUDE_MCP_PORTAL_TOKEN` (system of record for the
     current value; no app code reads it).
5. Keep a roster of who has been given the token — one row per person, with the date.

Never distribute the token by chat, email, ticket, or commit it to the repo.

---

## 3. Add the MCP server in Claude

Every staff member uses the **same** token and the same flags.

### Claude Desktop / Code (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "patientpro-portal": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=bhabbokbhnqioykjimix",
        "--features=database,docs"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<shared claude-mcp-portal token>"
      }
    }
  }
}
```

### claude.ai (remote connector)

Add a custom connector pointing at Supabase's hosted MCP endpoint:

```
https://mcp.supabase.com/mcp?project_ref=bhabbokbhnqioykjimix&read_only=true&features=database,docs
```

### Required flags — do not omit

| Flag | Why |
| --- | --- |
| `--read-only` | Blocks all writes/DDL. The real access boundary. |
| `--project-ref=bhabbokbhnqioykjimix` | Scopes to this project only, not the whole org. |
| `--features=database,docs` | Excludes branching, storage writes, and edge function deployment. |

---

## 4. Verify the connection

Restart Claude, then run these three checks:

1. **Schema visible** — "List the views in the `reporting` schema."
   Expect `appointment_summary`, `qa_case_summary`, `recapture_funnel`,
   `welcome_call_compliance`.
2. **Read works** — "Count appointments per project created in the last 30 days
   from `reporting.appointment_summary`."
3. **Write blocked** — "Run: `update all_appointments set status = 'Showed' where id = '00000000-0000-0000-0000-000000000000'`."
   Expect a refusal from read-only mode. If this succeeds, **stop and fix the flags.**

Starting queries for staff:

```sql
-- Appointments by status, last 30 days
select project_name, status, count(*)
from reporting.appointment_summary
where created_at > now() - interval '30 days'
group by 1, 2
order by 1, 3 desc;

-- Open QA cases by workflow bucket
select workflow_status, count(*)
from reporting.qa_case_summary
group by 1 order by 2 desc;

-- Welcome call compliance, last 8 weeks
select * from reporting.welcome_call_compliance
where appointment_week > current_date - 56
order by appointment_week desc, project_name;
```

---

## 5. The read-only layer (already applied)

A migration created the `reporting` schema and the `claude_reader` role:

| View | Contents |
| --- | --- |
| `reporting.appointment_summary` | Clinic, status, dates, procedure, review stage, short-notice / OON flags, welcome-call state |
| `reporting.qa_case_summary` | Workflow status, error category and source, escalation, turnaround timestamps |
| `reporting.recapture_funnel` | Lost type, work status, outcome, attempts, recovery flag |
| `reporting.welcome_call_compliance` | Per-clinic weekly attempt / reached / no-answer counts |

Properties of the layer:

- Superseded and reserved-block rows are excluded, so results match the portal.
- `claude_reader` has `SELECT` on those views only — verified: no raw-table access,
  no `auth` or `storage` access, no write privileges.
- The `reporting` schema is **not** exposed to the public API — `anon` has no access to it.
- `claude_reader` has no password and cannot log in until an admin sets one; it is the
  boundary for direct database connections. MCP itself is bounded by `--read-only`.

To add a metric, extend or add a view in `reporting` rather than granting table access.

---

## 6. Ongoing operations

**Rotation cadence:** monthly, and immediately when anyone holding the token leaves or
changes role.

Rotation is a two-step so nobody is locked out mid-flight:

1. Generate a new `claude-mcp-portal` token in Supabase.
2. Update `CLAUDE_MCP_PORTAL_TOKEN` and the password-manager entry, then have staff paste
   the new value into their Claude config.
3. **Only after** the new token is confirmed working, revoke the old one in Supabase.

**Audit gap:** the portal's `hipaa_audit_log` does not capture Claude reads, and the shared
token makes MCP queries attributable to the portal rather than an individual. Supabase
project logs are the audit trail. Document both facts in policy; the curated views are what
keep query shapes known in advance.
