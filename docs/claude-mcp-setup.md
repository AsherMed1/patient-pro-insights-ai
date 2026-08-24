# Connecting Claude to the Portal Database (Supabase MCP)

Read-only Claude access to the PatientPro Portal database via Supabase's official
hosted MCP server. No app code is involved — this is Supabase + Claude configuration.

Supabase project ref: `bhabbokbhnqioykjimix`

---

## 1. Compliance gate (do this first)

Full-record access means PHI leaves the portal and enters Claude.

- [ ] BAA in place with Anthropic (Enterprise / commercial plan). Consumer Claude plans are **not** HIPAA-covered.
- [ ] Access limited to named internal staff. No clinic users. No shared tokens.
- [ ] Every connection is read-only — all writes stay in the portal so triggers,
      audit logs, and status side-effects are never bypassed.
- [ ] Access recorded in the HIPAA policy set: who holds a token, what they can read,
      and how tokens are revoked at offboarding.

If the BAA is not signed yet, run the pilot against the de-identified view layer
(section 5) instead of raw tables.

---

## 2. Each staff member creates their own token

1. Supabase Dashboard → account menu → **Access Tokens**.
2. **Generate new token**, name it `claude-mcp-<firstname>`.
3. Copy it once and paste it only into that person's own Claude MCP config.

Tokens are secrets: never in the repo, never in chat, never in a shared doc or password-free note.

---

## 3. Add the MCP server in Claude

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
        "SUPABASE_ACCESS_TOKEN": "<your-personal-access-token>"
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

Authorize with the Supabase account that holds access to the project.

### Required flags — do not omit

| Flag | Why |
| --- | --- |
| `--read-only` | Blocks all writes/DDL. The real access boundary. |
| `--project-ref=bhabbokbhnqioykjimix` | Scopes to this project only, not the whole org. |
| `--features=database,docs` | Excludes branching, storage writes, and edge function deployment. |

---

## 4. Verify the connection

Restart Claude, then run these three checks:

1. **Schema visible** — "List the tables in this database."
   Expect `all_appointments`, `qa_cases`, `new_leads`, `projects`, `recapture_cases`.
2. **Read works** — "Count appointments per project created in the last 30 days."
3. **Write blocked** — "Run: `update all_appointments set status = 'Showed' where id = '00000000-0000-0000-0000-000000000000'`."
   Expect a refusal from read-only mode. If this succeeds, **stop and fix the flags.**

Useful starting queries for staff:

```sql
-- Appointments by status, last 30 days
select project_name, status, count(*)
from all_appointments
where created_at > now() - interval '30 days'
  and coalesce(is_superseded, false) = false
group by 1, 2
order by 1, 3 desc;

-- Open QA cases by bucket
select status, count(*) from qa_cases group by 1 order by 2 desc;
```

Note when writing queries: exclude `is_superseded = true` rows, and remember
`review_status`/`review_stage` gate what is client-facing.

---

## 5. Optional hardening (recommended)

Not yet applied. Ask and we will ship it as a single migration:

- **`claude_reader` role** — `SELECT`-only grants, no access to `auth`/`storage` schemas.
- **Curated reporting views** — appointment summary, QA case summary, recapture funnel.
  Staff query views instead of 100+ raw tables; shapes queries and makes them reviewable.
- **De-identified view layer** — name, DOB, phone, email, and insurance IDs masked, for
  anyone outside BAA-covered access.

---

## 6. Ongoing operations

- Rotate tokens quarterly; revoke immediately on role change or offboarding.
- Keep the access roster in this repo or your compliance folder — one row per person and token name.
- **Audit gap:** portal `hipaa_audit_log` does not capture Claude reads. Supabase project
  logs are the audit trail for MCP queries. Note this gap in policy, or route staff through
  the curated views so query shapes are known in advance.
