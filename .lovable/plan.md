## Why this happened

When I ran the data-repair migration yesterday for Christa Hagemeier's appointment, I inserted a note with `created_by = 'Lovable Support'` and the text "Status restored to 'Confirmed' by Lovable Support…". That phrasing leaked the internal tooling name into the client portal, which violates the rule that "Lovable" must never appear anywhere a clinic user can see.

The note ID is `e9ff8741-3520-45cb-a550-afc69709db92` on appointment `3c5afa52-5b06-4421-98f7-37f0598098df`.

## Plan

1. **Rewrite the existing note** via migration:
   - `created_by` → `System`
   - `note_text` → `Status restored to "Confirmed" by Support — prior status updates were silently blocked by a permissions gap that has now been fixed.`

2. **Audit and scrub the codebase** for any other client-visible "Lovable" strings:
   - `supabase/functions/support-ai-chat/index.ts:60` — only a server-side `console.log("…Lovable AI Gateway…")`, not user-visible. Leave as-is (internal log).
   - Confirm no other UI strings, toasts, email templates, or notes contain "Lovable".

3. **Save a project memory rule** at `mem://constraints/no-lovable-branding`: never use the word "Lovable" in any client-visible surface (notes, toasts, emails, UI copy). Internal tool/system attribution should use "System" or "Support". Add a one-liner to `mem://index.md` Core so it's always in context for future repairs.

## Technical details

- Single SQL `UPDATE appointment_notes SET created_by='System', note_text='…' WHERE id='e9ff8741-3520-45cb-a550-afc69709db92';`
- No schema changes, no RLS changes.
- Memory file write + index.md update.
