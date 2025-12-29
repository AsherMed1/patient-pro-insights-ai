import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Headphones, Send, CheckCircle, Loader2, Search, Bot, User, AlertCircle, UserCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface SupportConversation {
  id: string;
  project_name: string;
  user_email: string | null;
  user_name: string | null;
  status: string;
  type: string;
  created_at: string;
  updated_at: string;
  assigned_agent: string | null;
}

interface SupportMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  created_at: string;
}

export default function SupportQueueManager() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('waiting_agent');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to conversation updates
    const channel = supabase
      .channel('support-conversations-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_conversations',
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      
      // Subscribe to messages for selected conversation
      const channel = supabase
        .channel(`support-messages-${selectedConversation.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as SupportMessage]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation?.id]);

  const fetchConversations = async () => {
    setLoading(true);
    
    let query = supabase
      .from('support_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (searchTerm) {
      query = query.or(`user_email.ilike.%${searchTerm}%,project_name.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load support conversations',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setConversations(data || []);
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
      setLoadingMessages(false);
      return;
    }

    // Cast the role to the correct type
    const typedMessages: SupportMessage[] = (data || []).map((msg: any) => ({
      ...msg,
      role: msg.role as 'user' | 'assistant' | 'agent' | 'system'
    }));

    setMessages(typedMessages);
    setLoadingMessages(false);
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyContent.trim() || sending) return;

    setSending(true);
    try {
      // Insert agent message
      const { error: msgError } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: selectedConversation.id,
          role: 'agent',
          content: replyContent.trim()
        });

      if (msgError) throw msgError;

      // Update conversation status to active and assign agent
      const { error: convError } = await supabase
        .from('support_conversations')
        .update({ 
          status: 'active',
          assigned_agent: user?.id 
        })
        .eq('id', selectedConversation.id);

      if (convError) throw convError;

      setReplyContent('');
      toast({
        title: 'Message Sent',
        description: 'Your reply has been sent to the user.',
      });

      // Refresh conversation to update status
      fetchConversations();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase
        .from('support_conversations')
        .update({ status: 'resolved' })
        .eq('id', selectedConversation.id);

      if (error) throw error;

      // Insert system message
      await supabase
        .from('support_messages')
        .insert({
          conversation_id: selectedConversation.id,
          role: 'system',
          content: 'This conversation has been resolved. Thank you for contacting support!'
        });

      toast({
        title: 'Conversation Resolved',
        description: 'The support conversation has been marked as resolved.',
      });

      setSelectedConversation(null);
      fetchConversations();
    } catch (error) {
      console.error('Error resolving conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve conversation',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting_agent':
        return <Badge variant="destructive" className="animate-pulse">Waiting</Badge>;
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'resolved':
        return <Badge variant="secondary">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4" />;
      case 'agent':
        return <UserCircle className="h-4 w-4" />;
      case 'system':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getWaitingCount = () => {
    return conversations.filter(c => c.status === 'waiting_agent').length;
  };

  return (
    <div className="h-[calc(100vh-200px)] flex gap-4">
      {/* Left Sidebar - Conversations List */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 mb-3">
            <Headphones className="h-5 w-5" />
            Support Queue
            {getWaitingCount() > 0 && (
              <Badge variant="destructive">{getWaitingCount()}</Badge>
            )}
          </CardTitle>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search email or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conversations</SelectItem>
                <SelectItem value="waiting_agent">Waiting for Agent</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 px-4">
              <Headphones className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No support conversations</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-3 rounded-lg text-left transition-colors hover:bg-muted/50 ${
                      isSelected ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {(conv.user_name || conv.user_email || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">
                            {conv.user_name || conv.user_email || 'Anonymous'}
                          </span>
                          {getStatusBadge(conv.status)}
                        </div>
                        
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.project_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Center - Chat View */}
      <Card className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Headphones className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a support request from the queue to view and respond</p>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {(selectedConversation.user_name || selectedConversation.user_email || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {selectedConversation.user_name || selectedConversation.user_email || 'Anonymous'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedConversation.project_name} • {getStatusBadge(selectedConversation.status)}
                  </p>
                </div>
                {selectedConversation.status !== 'resolved' && (
                  <Button variant="outline" size="sm" onClick={handleResolve}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                )}
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2",
                        msg.role === 'agent' ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                        msg.role === 'user' 
                          ? "bg-blue-500 text-white" 
                          : msg.role === 'agent'
                          ? "bg-green-500 text-white"
                          : msg.role === 'system'
                          ? "bg-amber-500 text-white"
                          : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                      )}>
                        {getMessageIcon(msg.role)}
                      </div>

                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2",
                        msg.role === 'agent' 
                          ? "bg-green-500 text-white rounded-br-md"
                          : msg.role === 'user'
                          ? "bg-blue-500 text-white rounded-bl-md"
                          : msg.role === 'system'
                          ? "bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      )}>
                        <p className="text-xs font-medium mb-1 opacity-75">
                          {msg.role === 'user' ? 'User' : msg.role === 'agent' ? 'Agent' : msg.role === 'assistant' ? 'AI Assistant' : 'System'}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <span className={cn(
                          "text-[10px] mt-1 block opacity-70"
                        )}>
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {selectedConversation.status !== 'resolved' && (
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendReply}
                    disabled={!replyContent.trim() || sending}
                    className="px-4"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
