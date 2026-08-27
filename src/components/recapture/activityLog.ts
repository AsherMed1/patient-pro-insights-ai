import { supabase } from '@/integrations/supabase/client';

/** Append-only action types recorded for the Recapture Setter Activity report. */
export type RecaptureActivityType =
  | 'opened'
  | 'assignment'
  | 'attempt'
  | 'follow_up_scheduled'
  | 'completed'
  | 'reopened'
  | 'note';

export const RECAPTURE_ACTION_LABELS: Record<string, string> = {
  opened: 'Opened',
  assignment: 'Claimed / Assigned',
  attempt: 'Attempt Logged',
  follow_up_scheduled: 'Follow-Up Scheduled',
  completed: 'Completed',
  reopened: 'Reopened',
  note: 'Note',
};

export interface RecaptureActivityInput {
  caseId: string;
  activityType: RecaptureActivityType;
  description?: string | null;
  channel?: string | null;
  result?: string | null;
  conversationOutcome?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  createdAt?: string;
}

/**
 * Writes one immutable activity row. Never throws — activity logging must not
 * block or roll back the setter's action.
 */
export async function logRecaptureActivity(input: RecaptureActivityInput): Promise<void> {
  try {
    const { error } = await supabase.from('recapture_case_activity' as any).insert({
      case_id: input.caseId,
      activity_type: input.activityType,
      description: input.description ?? null,
      channel: input.channel ?? null,
      result: input.result ?? null,
      conversation_outcome: input.conversationOutcome ?? null,
      actor_user_id: input.actorUserId ?? null,
      actor_name: input.actorName ?? null,
      ...(input.createdAt ? { created_at: input.createdAt } : {}),
    } as any);
    if (error) console.warn('[recapture] activity log failed', error.message);
  } catch (e) {
    console.warn('[recapture] activity log failed', e);
  }
}
