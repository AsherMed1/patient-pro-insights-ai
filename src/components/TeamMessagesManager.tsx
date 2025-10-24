import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, ExternalLink, Loader2, Search, Filter } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ModernMessageBubble } from './chat/ModernMessageBubble';
import { MessageInput } from './chat/MessageInput';
import { DateSeparator } from './chat/DateSeparator';
import { EmptyState } from './chat/EmptyState';
import type { Message, Patient } from './chat/types';

interface Project {
  project_name: string;
}

interface GroupedMessages {
  [projectName: string]: Message[];
}

export default function TeamMessagesManager() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProjects();
    fetchMessages();
    subscribeToRealtimeUpdates();
  }, [filterProject, showUnreadOnly, searchTerm]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('project_name')
      .eq('active', true)
      .order('project_name');

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    setProjects(data || []);
  };

  const fetchMessages = async () => {
    setLoading(true);
    
    let query = supabase
      .from('project_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);

    if (filterProject !== 'all') {
      query = query.eq('project_name', filterProject);
    }

    if (showUnreadOnly) {
      query = query.eq('direction', 'inbound').is('read_at', null);
    }

    if (searchTerm) {
      query = query.ilike('message', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setMessages((data as any[]) || []);
    setLoading(false);
  };

  const subscribeToRealtimeUpdates = () => {
    const channel = supabase
      .channel('team-messages-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_messages',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message]);
            
            if ((payload.new as Message).direction === 'inbound') {
              toast({
                title: 'New Message',
                description: `New message from ${(payload.new as Message).project_name}`,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as Message) : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (message: string, patientReference?: Patient) => {
    if (!selectedProject || !message.trim() || sending) return;

    setSending(true);
    try {
      const payload: any = {
        project_name: selectedProject,
        message: message,
        sender_info: {
          name: 'Team Member',
          source: 'dashboard',
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

      const { error } = await supabase.functions.invoke('send-team-message', {
        body: payload,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    const { error } = await supabase
      .from('project_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const groupMessagesByProject = (): GroupedMessages => {
    const grouped: GroupedMessages = {};
    
    messages.forEach((msg) => {
      if (!grouped[msg.project_name]) {
        grouped[msg.project_name] = [];
      }
      grouped[msg.project_name].push(msg);
    });

    return grouped;
  };

  const getUnreadCount = (projectName: string): number => {
    return messages.filter(
      (msg) => msg.project_name === projectName && 
      msg.direction === 'inbound' && 
      !msg.read_at
    ).length;
  };

  const getProjectInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getLatestMessage = (projectName: string): Message | undefined => {
    const projectMessages = messages.filter(m => m.project_name === projectName);
    return projectMessages[projectMessages.length - 1];
  };

  const groupedMessages = groupMessagesByProject();
  const projectNames = Object.keys(groupedMessages).sort((a, b) => {
    const aLatest = getLatestMessage(a)?.created_at || '';
    const bLatest = getLatestMessage(b)?.created_at || '';
    return bLatest.localeCompare(aLatest);
  });

  // Group selected project messages by date
  const selectedProjectMessages = selectedProject ? groupedMessages[selectedProject] || [] : [];
  const groupedByDate = selectedProjectMessages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="h-[calc(100vh-200px)] flex gap-4">
      {/* Left Sidebar - Conversations List */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-5 w-5" />
            Team Messages
          </CardTitle>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.project_name} value={project.project_name}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="unread-only"
                checked={showUnreadOnly}
                onCheckedChange={(checked) => setShowUnreadOnly(checked as boolean)}
              />
              <Label htmlFor="unread-only" className="text-sm cursor-pointer">
                Unread only
              </Label>
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : projectNames.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 px-4">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {projectNames.map((projectName) => {
                const unreadCount = getUnreadCount(projectName);
                const latestMessage = getLatestMessage(projectName);
                const isSelected = selectedProject === projectName;

                return (
                  <button
                    key={projectName}
                    onClick={() => setSelectedProject(projectName)}
                    className={`w-full p-3 rounded-lg text-left transition-colors hover:bg-muted/50 ${
                      isSelected ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getProjectInitials(projectName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">
                            {projectName}
                          </span>
                          {unreadCount > 0 && (
                            <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                        
                        {latestMessage && (
                          <>
                            <p className="text-xs text-muted-foreground truncate">
                              {latestMessage.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(latestMessage.created_at), {
                                addSuffix: true
                              })}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Center - Message View */}
      <Card className="flex-1 flex flex-col">
        {!selectedProject ? (
          <CardContent className="flex-1 flex items-center justify-center">
            <EmptyState
              title="Select a conversation"
              description="Choose a project from the list to view and send messages"
            />
          </CardContent>
        ) : (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getProjectInitials(selectedProject)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedProject}
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/project/${encodeURIComponent(selectedProject)}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Portal
                  </a>
                </Button>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 px-6" ref={scrollRef}>
              {selectedProjectMessages.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="py-4">
                  {Object.entries(groupedByDate).map(([date, msgs]) => (
                    <div key={date}>
                      <DateSeparator date={msgs[0].created_at} />
                      {msgs.map((message) => (
                        <ModernMessageBubble
                          key={message.id}
                          message={message}
                          projectName={selectedProject}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <MessageInput
              onSendMessage={handleSendMessage}
              projectName={selectedProject}
              sending={sending}
            />
          </>
        )}
      </Card>
    </div>
  );
}
