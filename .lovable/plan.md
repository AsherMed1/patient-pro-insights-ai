# QA Notes @mentions — Matt can only see himself

## What the checks show

- The `get_mentionable_users` database function returns **28 teammates** (admins, agents, QA specialists, VAs) including Gloria and Matt, and it runs with elevated rights so a VA like Matt is not filtered down to himself.
- Execute permission is granted to signed-in users, and the currently published app bundle already contains the fixed RPC-based lookup.

So the server side looks correct and the root cause is **not confirmed**. The two realistic explanations are: Matt's browser is still running a cached older bundle (the old code read the profiles table directly, which RLS trimmed to just himself), or the lookup call is failing in his session and the failure is silently swallowed — today the picker shows nothing and gives no error, so we cannot tell the two apart.

## Step 1 — Make the failure visible (this is what unblocks diagnosis)

The teammate lookup currently ignores every error and caches the result forever for the browser tab. Change it to:

- Log and surface a clear message when the lookup fails ("Couldn't load teammates — refresh and try again") instead of silently rendering an empty picker.
- Stop caching an empty or single-entry result, and retry on the next open.
- Show a small "No teammates found" row in the @ dropdown when the list is empty, so a broken load never looks like "only my name exists".

## Step 2 — Add a safety net so the picker can't collapse to one person

- If the lookup returns fewer than two people, fall back to a direct teammate query and use whichever result is larger.
- Always include the well-known `@AM` and `@Tech` groups when their members are present.

## Step 3 — Force fresh code for everyone

- Republish the app so any stale bundle is replaced, and ask Matt to hard-refresh (Cmd/Ctrl+Shift+R) once. If the picker still shows only his name after that, the new error message in Step 1 will tell us exactly what is failing in his session.

## Technical notes

- `src/hooks/useMentionableUsers.tsx`: capture `error` from `supabase.rpc('get_mentionable_users')`, expose `{ users, error, loading }`, only populate the module cache when `users.length > 1`, and add a fallback `profiles`-join query when the RPC yields 0-1 rows.
- `src/components/admin/MentionTextarea.tsx`: render an empty/error state row in the dropdown; guard `u.name`/`u.email` against nulls before `toLowerCase()` so one bad row can't blank the whole list.
- No database or edge function changes; the function and its grants are already correct.
