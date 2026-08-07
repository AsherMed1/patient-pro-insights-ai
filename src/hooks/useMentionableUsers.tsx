import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MentionableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Populated for group entries (@AM, @Tech). */
  members?: MentionableUser[];
}

/** Team aliases: tagging @AM / @Tech notifies everyone in the group. */
export const MENTION_GROUPS: Record<string, string[]> = {
  AM: ['marissa.k@patientpromarketing.com', 'duncan.d@patientpromarketing.com'],
  Tech: [
    'luis.d@patientpromarketing.com',
    'johann.p@patientpromarketing.com',
    'althea.r@patientpromarketing.com',
    'mohsin.l@patientpromarketing.com',
  ],
};

export const GROUP_PREFIX = 'group:';

const QA_ROLES = ['admin', 'agent', 'qa_specialist', 'va'];

interface LoadResult {
  users: MentionableUser[];
  error: string | null;
}

// Only a *healthy* list (more than one teammate) is cached; a failed or
// truncated load must never stick around for the rest of the session.
let cache: MentionableUser[] | null = null;
let inflight: Promise<LoadResult> | null = null;

const toUser = (p: any): MentionableUser => ({
  id: p.id,
  name: p.full_name || p.email || 'Unknown user',
  email: p.email || '',
  role: p.role || '',
});

const sortByName = (list: MentionableUser[]) =>
  [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

/** Direct fallback used when the security-definer RPC returns 0-1 people. */
const loadFallback = async (): Promise<MentionableUser[]> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, role, profiles:profiles!user_roles_user_id_fkey(id, full_name, email)')
    .in('role', QA_ROLES as any);

  if (error) {
    console.warn('[mentions] fallback teammate query failed:', error.message);
    return [];
  }

  const seen = new Set<string>();
  const people: MentionableUser[] = [];
  for (const row of (data as any[]) || []) {
    const p = row.profiles;
    if (!p?.id || seen.has(p.id)) continue;
    seen.add(p.id);
    people.push(toUser({ ...p, role: row.role }));
  }
  return sortByName(people);
};

const withGroups = (people: MentionableUser[]): MentionableUser[] => {
  if (people.length === 0) return [];
  const groups: MentionableUser[] = Object.entries(MENTION_GROUPS).map(([label, emails]) => {
    const members = people.filter((u) =>
      emails.some((e) => e.toLowerCase() === (u.email || '').toLowerCase()),
    );
    return {
      id: `${GROUP_PREFIX}${label}`,
      name: label,
      email: members.map((m) => m.name).join(', ') || 'no members',
      role: 'team',
      members,
    };
  });
  return [...groups.filter((g) => (g.members || []).length > 0), ...people];
};

const load = async (): Promise<LoadResult> => {
  // Security-definer RPC: readable by any signed-in user, so non-admins
  // (VA / agent / QA specialist) can see the full teammate list too.
  const { data, error } = await supabase.rpc('get_mentionable_users' as any);

  if (error) console.warn('[mentions] get_mentionable_users failed:', error.message);

  let people = sortByName(((data as any[]) || []).map(toUser));

  // Safety net: a truncated list (only yourself, or nothing) means the RPC was
  // blocked or the client is stale — try a direct query and keep the bigger set.
  if (people.length < 2) {
    const fallback = await loadFallback();
    if (fallback.length > people.length) people = fallback;
  }

  if (people.length === 0) {
    return {
      users: [],
      error: error?.message || "Couldn't load teammates — refresh and try again.",
    };
  }

  return { users: withGroups(people), error: null };
};

export const useMentionableUsers = () => {
  const [users, setUsers] = useState<MentionableUser[]>(cache || []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    setLoading(true);
    const p = inflight || load();
    inflight = p;
    p.then((res) => {
      // Cache only a healthy list so a bad load retries on the next mount.
      if (res.users.filter((u) => !u.id.startsWith(GROUP_PREFIX)).length > 1) cache = res.users;
      if (!cancelled) {
        setUsers(res.users);
        setError(res.error);
      }
    })
      .catch((e) => {
        console.warn('[mentions] teammate load threw:', e);
        if (!cancelled) setError("Couldn't load teammates — refresh and try again.");
      })
      .finally(() => {
        inflight = null;
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { users, error, loading } as const;
};
