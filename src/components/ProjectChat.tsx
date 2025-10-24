import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Search, Loader2, X, Minimize2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ModernMessageBubble } from './chat/ModernMessageBubble';
import { MessageInput } from './chat/MessageInput';
import { DateSeparator } from './chat/DateSeparator';
import { EmptyState } from './chat/EmptyState';
import type { Message, Patient } from './chat/types';
import { format } from 'date-fns';

interface ProjectChatProps {
  projectName: string;
}

export default function ProjectChat({ projectName }: ProjectChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

      const messagesData = (data || []) as any[];
      setMessages(messagesData);
      
      // Calculate unread count for inbound messages
      const unread = messagesData.filter(
        msg => msg.direction === 'inbound' && !msg.read_at
      ).length;
      setUnreadCount(unread);
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
            const newMessage = payload.new as any;
            setMessages((prev) => [...prev, newMessage]);
            
            // Update unread count if inbound and not read
            if (newMessage.direction === 'inbound' && !newMessage.read_at) {
              setUnreadCount(prev => prev + 1);
              
              // Show toast notification if chat is closed
              if (!isOpen) {
                toast.info('New message from team', {
                  description: newMessage.message.substring(0, 50) + '...',
                });
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as any) : msg
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
  }, [projectName, isOpen]);

  // Auto-scroll to bottom when new messages arrive or chat opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      setTimeout(() => {
        const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }, 100);
    }
  }, [messages, isOpen]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      const markAllAsRead = async () => {
        const unreadMessages = messages.filter(
          msg => msg.direction === 'inbound' && !msg.read_at
        );
        
        for (const msg of unreadMessages) {
          await supabase
            .from('project_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id);
        }
        
        setUnreadCount(0);
      };
      
      markAllAsRead();
    }
  }, [isOpen]);

  const handleSendMessage = async (message: string, patientReference?: Patient) => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      const payload: any = {
        project_name: projectName,
        message: message,
        sender_info: {
          name: user?.email || 'Project User',
          email: user?.email,
          source: 'project_portal',
          timestamp: new Date().toISOString(),
        },
      };

      if (patientReference) {
        payload.patient_reference = {
          name: patientReference.lead_name,
          phone: patientReference.phone_number,
          contact_id: patientReference.id,
          email: patientReference.email,
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

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50 ${
          isOpen ? 'hidden' : ''
        }`}
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[400px] h-[600px] flex flex-col shadow-2xl z-50 animate-scale-in">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-5 w-5" />
                Team Chat
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {projectName}
            </p>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </CardHeader>

          {isLoading ? (
            <CardContent className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          ) : (
            <>
              <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                {!hasMessages ? (
                  <EmptyState 
                    title={searchTerm ? 'No messages found' : 'No messages yet'}
                    description={searchTerm ? 'Try adjusting your search' : 'Start a conversation with the team'}
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
                placeholder="Type a message... (@ for patient)"
              />
            </>
          )}
        </Card>
      )}
    </>
  );
}
