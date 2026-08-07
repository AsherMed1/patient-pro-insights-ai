import { supabase } from '@/integrations/supabase/client';

/**
 * Escalation Type (stored in qa_cases.resolution_type — label-only rename).
 */
export const ESCALATION_TYPES = [
  'Resolved by QA',
  'Escalated to Tech',
  'Escalated to AM',
  'Escalated to Gloria',
  'Other',
] as const;

export type EscalationType = (typeof ESCALATION_TYPES)[number];

export const ESCALATION_STATUSES = [
  'Awaiting Review',
  'Awaiting Clinic Response',
  'Follow-Up Required',
  'Response Received',
  'Resolved',
] as const;

export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

export const isEscalationType = (v: string | null | undefined) =>
  !!v && v.startsWith('Escalated to');

/** Owner email for escalation types that route to a fixed person. */
const FIXED_OWNER_EMAIL: Record<string, string> = {
  'Escalated to Gloria': 'gloria.g@patientpromarketing.com',
};

export const escalationStatusClass = (s: string | null | undefined): string => {
  switch (s) {
    case 'Awaiting Review':
      return 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200';
    case 'Awaiting Clinic Response':
      return 'border-sky-500 bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200';
    case 'Follow-Up Required':
      return 'border-rose-500 bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200';
    case 'Response Received':
      return 'border-violet-500 bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200';
    case 'Resolved':
      return 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200';
    default:
      return '';
  }
};

/** Resolve the default owner user id for an escalation type, if one is fixed. */
export const resolveFixedOwnerId = async (
  escalationType: string | null | undefined,
): Promise<string | null> => {
  const email = escalationType ? FIXED_OWNER_EMAIL[escalationType] : undefined;
  if (!email) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  return (data as any)?.id ?? null;
};

export type NotificationKind =
  | 'mention'
  | 'assignment'
  | 'escalation_status'
  | 'ticket_update'
  | 'case_status';

interface NotifyParams {
  userIds: (string | null | undefined)[];
  caseId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  noteId?: string | null;
}

/**
 * Fan out an in-app notification to the bell feed. Self-notifications and
 * duplicates are dropped.
 */
export const notifyQAUsers = async ({
  userIds,
  caseId,
  kind,
  title,
  body = null,
  actorId = null,
  actorName = null,
  noteId = null,
}: NotifyParams) => {
  const targets = [...new Set(userIds.filter((u): u is string => !!u))].filter(
    (u) => u !== actorId,
  );
  if (targets.length === 0) return;
  await supabase.from('qa_note_mentions' as any).insert(
    targets.map((uid) => ({
      case_id: caseId,
      note_id: noteId,
      kind,
      title,
      body,
      mentioned_user_id: uid,
      mentioned_by_user_id: actorId,
      mentioned_by_name: actorName,
    })) as any,
  );
};

export const daysOutstanding = (from: string | null | undefined): number | null => {
  if (!from) return null;
  const ms = Date.now() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

export const agingClass = (days: number | null): string => {
  if (days === null) return '';
  if (days >= 7) return 'text-rose-600 dark:text-rose-400 font-semibold';
  if (days >= 3) return 'text-amber-600 dark:text-amber-400 font-medium';
  return '';
};
