
## Problem

`docs/oon-dnc-workflow.mmd` fails to render with "Failed to fetch". The most likely cause is invalid mermaid syntax inside node labels:

- The pipe character `|` is reserved for edge labels — using it inside a node string (`alert_type = 'oon' | 'do_not_call'`) breaks the parser.
- Parentheses inside quoted node labels (e.g. `(admin)`, `by {user}`) can also trip the lexer in some renderer versions.
- The `|"…"|` edge-label syntax mixed with multi-line `<br/>` labels sometimes surfaces as a fetch failure when the renderer service rejects the payload.

## Fix

Rewrite `docs/oon-dnc-workflow.mmd` with parser-safe labels:

- Replace `|` inside labels with the word "or" (e.g. `alert_type = oon or do_not_call`).
- Replace `{user}` with `user` and drop stray parentheses inside quoted labels (`Mark OON admin` instead of `Mark OON (admin)`).
- Keep the same overall structure (subgraphs: Entry points, OON side-effects, DNC side-effects, Terminal, Protections) and the same arrows.
- Use `flowchart TD` (top-down) for a slightly more compact render, but keep everything else identical.
- Validate mentally against mermaid v10 syntax: only `-->`, `-.->`, and `-->|label|` edges; all node labels wrapped in `"…"`.

No other files change. `docs/oon-dnc-workflow.md` already reads correctly and needs no edits.

## Verification

After the rewrite, re-open the `.mmd` preview — it should render the same flow without a fetch error.
