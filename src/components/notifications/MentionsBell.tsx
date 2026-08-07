import { Bell, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQAMentions, type QAMention } from '@/hooks/useQAMentions';
import { stripMentionTokens } from '@/lib/mentions';
import { useState } from 'react';

const ALERT_LABELS: Record<string, string> = {
  short_notice: 'Short Notice',
  oon: 'OON',
  confirmed_audit: 'Confirmed Audit',
  review_queue: 'Review Queue',
  no_show: 'No-Show',
  cancelled: 'Cancellation',
};

export default function MentionsBell() {
  const { mentions, unreadCount, markRead, markAllRead } = useQAMentions();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const unread = mentions.filter((m) => !m.read_at);

  const openMention = async (m: QAMention) => {
    setOpen(false);
    if (!m.read_at) await markRead(m.id);
    if (m.appointment_id) {
      // Mention lives on a patient record note in the Appointments portal.
      const noteParam = m.appointment_note_id ? `&note=${m.appointment_note_id}` : '';
      navigate(
        `/?tab=appointments&appointment=${m.appointment_id}${noteParam}&n=${m.id}-${Date.now()}`,
      );
      return;
    }
    const noteParam = m.note_id ? `&note=${m.note_id}` : '';
    navigate(`/?tab=qa-queue&qaCase=${m.case_id}${noteParam}&n=${m.id}-${Date.now()}`);
  };

  const headline = (m: QAMention) => {
    if (m.title) return m.title;
    return `${m.mentioned_by_name || 'Someone'} mentioned you`;
  };

  const detail = (m: QAMention) => {
    if (m.kind === 'mention' || m.note) return stripMentionTokens(m.note || '');
    return m.body || '';
  };

  const renderList = (list: QAMention[], emptyText: string) => (
    <div className="max-h-96 overflow-y-auto">
      {list.length === 0 && (
        <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
      )}
      {list.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => openMention(m)}
          className="flex w-full flex-col items-start gap-1 border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent"
        >
          <div className="flex w-full items-center gap-2">
            {!m.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
            <span className="truncate text-sm font-medium">{headline(m)}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {m.patient_name || 'Unknown patient'}
            {m.project_name ? ` • ${m.project_name}` : ''}
            {m.alert_type ? ` • ${ALERT_LABELS[m.alert_type] || m.alert_type}` : ''}
          </div>
          {detail(m) && (
            <div className="line-clamp-2 text-xs text-foreground/80">{detail(m)}</div>
          )}
        </button>
      ))}
    </div>
  );


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 border-none">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllRead()}>
              <Check className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <Tabs defaultValue="unread">
          <TabsList className="m-2 grid w-[calc(100%-1rem)] grid-cols-2">
            <TabsTrigger value="unread">Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value="unread" className="mt-0">
            {renderList(unread, 'No unread notifications.')}
          </TabsContent>
          <TabsContent value="all" className="mt-0">
            {renderList(mentions, 'No notifications yet.')}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
