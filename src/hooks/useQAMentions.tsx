import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface QAMention {
  id: string;
  note_id: string;
  case_id: string;
  mentioned_by_name: string | null;
  read_at: string | null;
  created_at: string;
  note: string | null;
  patient_name: string | null;
  project_name: string | null;
  alert_type: string | null;
}

const SELECT =
  '*, qa_case_notes(note), qa_cases(patient_name, project_name, alert_type)';

const shape = (rows: any[]): QAMention[] =>
  (rows || []).map((r) => ({
    id: r.id,
    note_id: r.note_id,
    case_id: r.case_id,
    mentioned_by_name: r.mentioned_by_name,
    read_at: r.read_at,
    created_at: r.created_at,
    note: r.qa_case_notes?.note ?? null,
    patient_name: r.qa_cases?.patient_name ?? null,
    project_name: r.qa_cases?.project_name ?? null,
    alert_type: r.qa_cases?.alert_type ?? null,
  }));

export const useQAMentions = () => {
  const { user } = useAuth();
  const [mentions, setMentions] = useState<QAMention[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMentions = useCallback(async () => {
    if (!user?.id) {
      setMentions([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('qa_note_mentions' as any)
      .select(SELECT)
      .eq('mentioned_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setMentions(shape((data as any[]) || []));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchMentions();
  }, [fetchMentions]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`qa-mentions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qa_note_mentions',
          filter: `mentioned_user_id=eq.${user.id}`,
        },
        () => { fetchMentions(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchMentions]);

  const markRead = useCallback(async (id: string) => {
    setMentions((prev) =>
      prev.map((m) => (m.id === id ? { ...m, read_at: new Date().toISOString() } : m)),
    );
    await supabase
      .from('qa_note_mentions' as any)
      .update({ read_at: new Date().toISOString() } as any)
      .eq('id', id)
      .is('read_at', null);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    setMentions((prev) => prev.map((m) => (m.read_at ? m : { ...m, read_at: now })));
    await supabase
      .from('qa_note_mentions' as any)
      .update({ read_at: now } as any)
      .eq('mentioned_user_id', user.id)
      .is('read_at', null);
  }, [user?.id]);

  const unreadCount = mentions.filter((m) => !m.read_at).length;

  return { mentions, unreadCount, loading, markRead, markAllRead, refresh: fetchMentions };
};
