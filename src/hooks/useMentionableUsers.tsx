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

// Roles that can reach QA Operations.
const QA_ROLES = ['admin', 'agent', 'qa_specialist', 'va'];

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

let cache: MentionableUser[] | null = null;
let inflight: Promise<MentionableUser[]> | null = null;

const load = async (): Promise<MentionableUser[]> => {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('role', QA_ROLES as any);

  const roleMap = new Map<string, string>();
  (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
  const ids = [...roleMap.keys()];
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ids);

  const people: MentionableUser[] = (profiles || [])
    .map((p: any) => ({
      id: p.id,
      name: p.full_name || p.email,
      email: p.email,
      role: roleMap.get(p.id) || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const groups: MentionableUser[] = Object.entries(MENTION_GROUPS).map(([label, emails]) => {
    const members = people.filter((u) =>
      emails.some((e) => e.toLowerCase() === u.email?.toLowerCase()),
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

export const useMentionableUsers = () => {
  const [users, setUsers] = useState<MentionableUser[]>(cache || []);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    const p = inflight || load();
    inflight = p;
    p.then((list) => {
      cache = list;
      if (!cancelled) setUsers(list);
    })
      .catch(() => { /* ignore */ })
      .finally(() => { inflight = null; });
    return () => { cancelled = true; };
  }, []);

  return users;
};
