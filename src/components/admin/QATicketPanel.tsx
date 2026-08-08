import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Send, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { renderWithLinks } from '@/lib/linkify';
import MentionTextarea from '@/components/admin/MentionTextarea';
import { parseMentions, renderNoteWithMentions } from '@/lib/mentions';
import { useUserAttribution } from '@/hooks/useUserAttribution';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { FunctionsHttpError } from '@supabase/supabase-js';


export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  awaiting_response: 'Awaiting Response',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const ticketStatusLabel = (status?: string | null) =>
  status ? (TICKET_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')) : 'Unknown';

export const ticketStatusClass = (status?: string | null) => {
  switch (status) {
    case 'resolved':
    case 'closed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'awaiting_response':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export interface QATicketEvent {
  id: string;
  case_id: string;
  ticket_id: string;
  event_type: string;
  status: string | null;
  author_name: string | null;
  body: string | null;
  occurred_at: string;
}

const eventLabel = (e: QATicketEvent) => {
  if (e.event_type === 'status_change') return `Status → ${ticketStatusLabel(e.status)}`;
  if (e.event_type === 'assignment') return 'Assignment updated';
  return 'Comment';
};

export default function QATicketPanel({
  caseId,
  ticketId,
  ticketUrl,
  ticketStatus,
  assignee,
  lastActivity,
  lastActivityAt,
  unread,
  onSeen,
}: {
  caseId: string;
  ticketId: string | null;
  ticketUrl: string | null;
  ticketStatus: string | null;
  assignee: string | null;
  lastActivity: string | null;
  lastActivityAt: string | null;
  unread: boolean;
  onSeen: () => void;
}) {
  const [events, setEvents] = useState<QATicketEvent[]>([]);

  useEffect(() => {
    if (!ticketId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('qa_ticket_events' as any)
        .select('*')
        .eq('case_id', caseId)
        .order('occurred_at', { ascending: false });
      if (!cancelled) setEvents(((data as any) || []) as QATicketEvent[]);
    };
    load();

    const channel = supabase
      .channel(`qa-ticket-events-${caseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'qa_ticket_events', filter: `case_id=eq.${caseId}` },
        () => { load(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [caseId, ticketId]);

  // Clear the unread indicator once the QA has the ticket panel on screen.
  useEffect(() => {
    if (!ticketId || !unread) return;
    const t = setTimeout(async () => {
      await supabase
        .from('qa_cases' as any)
        .update({ controlhub_ticket_unread: false, controlhub_ticket_seen_at: new Date().toISOString() } as any)
        .eq('id', caseId);
      onSeen();
    }, 600);
    return () => clearTimeout(t);
  }, [caseId, ticketId, unread]);

  if (!ticketId) return null;

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Ticket className="h-4 w-4" />
            ControlHub ticket
            {unread && (
              <span className="h-2 w-2 rounded-full bg-primary" title="New ticket activity" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{ticketId}</span>
            <Badge variant="outline" className={cn('text-[11px]', ticketStatusClass(ticketStatus))}>
              {ticketStatusLabel(ticketStatus)}
            </Badge>
            {assignee && <span>Assigned to {assignee}</span>}
            {lastActivityAt && (
              <span>Updated {format(new Date(lastActivityAt), 'MMM d, h:mm a')}</span>
            )}
          </div>
        </div>
        <a href={ticketUrl ?? '#'} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline" disabled={!ticketUrl}>
            Open ticket <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </a>
      </div>

      {lastActivity && (
        <div className="text-sm">
          <span className="text-muted-foreground">Latest: </span>
          {renderWithLinks(lastActivity)}
        </div>
      )}

      <div>
        <div className="text-xs font-semibold mb-1 text-muted-foreground">
          ControlHub Ticket Comments
        </div>
        {events.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No updates received from ControlHub yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {events.map((e) => (
              <div
                key={e.id}
                className={cn(
                  'text-xs border-l-2 pl-2',
                  e.direction === 'outbound' ? 'border-primary' : 'border-muted',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{eventLabel(e)}</span>
                  {e.author_name && <span className="text-muted-foreground">{e.author_name}</span>}
                  <span className="text-muted-foreground">
                    {format(new Date(e.occurred_at), 'MMM d, h:mm a')}
                  </span>
                  {e.direction === 'outbound' && (
                    <Badge variant="outline" className="text-[10px]">
                      Sent from QA Operations
                    </Badge>
                  )}
                </div>
                {e.body && (
                  <div className="mt-0.5 whitespace-pre-wrap break-words">
                    {renderNoteWithMentions(e.body)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-3">
        <MentionTextarea
          value={draft}
          onChange={setDraft}
          rows={3}
          disabled={sending}
          placeholder="Reply on the ControlHub ticket… (type @ to tag a teammate)"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Shared with ControlHub — visible to Tech, AMs and Gloria.
          </span>
          <Button size="sm" onClick={postComment} disabled={sending || !draft.trim()}>
            <Send className="h-3 w-3 mr-1" />
            {sending ? 'Posting…' : 'Post comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

