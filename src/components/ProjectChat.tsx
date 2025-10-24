import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MessageSquare, Search, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ModernMessageBubble } from './chat/ModernMessageBubble';
import { MessageInput } from './chat/MessageInput';
import { DateSeparator } from './chat/DateSeparator';
import { EmptyState } from './chat/EmptyState';
import type { Message, Patient } from './chat/types';
import { format, isSameDay } from 'date-fns';

interface ProjectChatProps {
  projectName: string;
}

export default function ProjectChat({ projectName }: ProjectChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Fetch message history
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_name', projectName)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []) as any[]);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('project-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_messages',
          filter: `project_name=eq.${projectName}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as Message) : msg
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectName]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (message: string, patientReference?: Patient) => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      const payload: any = {
        project_name: projectName,
        message: message,
        sender_type: 'user',
        sender_name: user?.email,
        sender_email: user?.email,
      };

      if (patientReference) {
        payload.patient_reference = {
          patient_id: patientReference.id,
          patient_name: patientReference.lead_name,
          phone: patientReference.phone_number,
          appointment_id: patientReference.appointment_id,
        };
      }

      const { data, error } = await supabase.functions.invoke('send-team-message', {
        body: payload,
      });

      if (error) throw error;

      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  // Filter messages by search term
  const filteredGroupedMessages = Object.entries(groupedMessages).reduce((result, [date, msgs]) => {
    const filtered = msgs.filter(msg => 
      msg.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.patient_reference?.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      result[date] = filtered;
    }
    return result;
  }, {} as Record<string, Message[]>);

  const hasMessages = Object.keys(filteredGroupedMessages).length > 0;

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Team Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Team Chat
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {projectName}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 px-6" ref={scrollRef}>
        {!hasMessages ? (
          <EmptyState 
            title={searchTerm ? 'No messages found' : 'No messages yet'}
            description={searchTerm ? 'Try adjusting your search terms' : 'Start a conversation by sending a message below.'}
          />
        ) : (
          <div className="py-4">
            {Object.entries(filteredGroupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <DateSeparator date={msgs[0].created_at} />
                {msgs.map((message) => (
                  <ModernMessageBubble
                    key={message.id}
                    message={message}
                    projectName={projectName}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <MessageInput
        onSendMessage={handleSendMessage}
        projectName={projectName}
        sending={isSending}
      />
    </Card>
  );
}
