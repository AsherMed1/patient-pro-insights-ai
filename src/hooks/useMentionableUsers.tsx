import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MentionableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Roles that can reach QA Operations.
const QA_ROLES = ['admin', 'agent', 'qa_specialist', 'va'];

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

  return (profiles || [])
    .map((p: any) => ({
      id: p.id,
      name: p.full_name || p.email,
      email: p.email,
      role: roleMap.get(p.id) || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
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
