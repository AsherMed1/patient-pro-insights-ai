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

// Roles that can reach QA Operations (enforced inside get_mentionable_users()).


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
  // Security-definer RPC: readable by any signed-in user, so non-admins
  // (VA / agent / QA specialist) can see the full teammate list too.
  const { data } = await supabase.rpc('get_mentionable_users' as any);

  const people: MentionableUser[] = ((data as any[]) || [])
    .map((p: any) => ({
      id: p.id,
      name: p.full_name || p.email,
      email: p.email,
      role: p.role || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (people.length === 0) return [];


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
