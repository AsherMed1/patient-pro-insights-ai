# Fix: non-admins can only tag themselves in QA notes

## What's happening

The teammate picker builds its list by reading the `user_roles` and `profiles` tables directly from the browser. Both tables are locked down so that only admins can read everyone; everybody else can read **only their own row**.

So for Gloria (VA role) and anyone else who isn't an admin, the picker returns exactly one person — herself. The `@AM` / `@Tech` group entries also disappear, because their members can't be read either. This affects the Escalation tab, the QA Operations notes, and patient-record notes — everywhere the picker is used. It is not specific to the Escalation tab.

## The fix

Expose a small, purpose-built lookup that returns only what the picker needs — id, full name, email, role — for teammates who have QA access (admin, agent, QA specialist, VA). Any signed-in portal user can call it; it does not widen access to the profiles table itself, so no other profile fields (or non-QA users) become readable.

The picker then reads from that lookup instead of querying the tables directly. Result: every QA-access teammate is taggable by everyone, and `@AM` / `@Tech` resolve for all users.

## Technical detail

- Migration: `create function public.get_mentionable_users() returns table(id uuid, full_name text, email text, role text)`, `language sql stable security definer set search_path = public`. Body joins `profiles` to `user_roles` filtered to `('admin','agent','qa_specialist','va')`, one row per user (pick the highest-privilege role via `distinct on`/ordering). `grant execute on function public.get_mentionable_users() to authenticated;` and `revoke ... from anon`.
- `src/hooks/useMentionableUsers.tsx`: replace the two `supabase.from(...)` reads in `load()` with a single `supabase.rpc('get_mentionable_users')`; keep the existing shaping, sorting, `MENTION_GROUPS` expansion and module-level cache unchanged.
- No RLS policy changes on `profiles` / `user_roles`.
- Verify by signing in as a non-admin (VA) and confirming the `@` picker lists all QA teammates plus `@AM` and `@Tech`.
