import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Send, MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  project_name: string;
  message: string;
  direction: 'inbound' | 'outbound';
  sender_name?: string;
  sender_phone?: string;
  created_at: string;
  read_at?: string;
}

interface Project {
  project_name: string;
}

interface GroupedMessages {
  [projectName: string]: Message[];
}

export default function TeamMessagesManager() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMap, setSendingMap] = useState<Map<string, boolean>>(new Map());
  const [replyTexts, setReplyTexts] = useState<Map<string, string>>(new Map());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProjects();
    fetchMessages();
    subscribeToRealtimeUpdates();
  }, [selectedProject, showUnreadOnly, searchTerm]);

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
      .order('created_at', { ascending: false })
      .limit(100);

    if (selectedProject !== 'all') {
      query = query.eq('project_name', selectedProject);
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

    setMessages((data as Message[]) || []);
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
            setMessages((prev) => [payload.new as Message, ...prev]);
            
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

  const handleReply = async (projectName: string) => {
    const message = replyTexts.get(projectName)?.trim();
    
    if (!message) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    setSendingMap(new Map(sendingMap.set(projectName, true)));

    try {
      const { error } = await supabase.functions.invoke('send-team-message', {
        body: {
          project_name: projectName,
          message: message,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });

      setReplyTexts(new Map(replyTexts.set(projectName, '')));
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSendingMap(new Map(sendingMap.set(projectName, false)));
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

  const toggleProject = (projectName: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectName)) {
      newExpanded.delete(projectName);
    } else {
      newExpanded.add(projectName);
    }
    setExpandedProjects(newExpanded);
  };

  const groupedMessages = groupMessagesByProject();
  const projectNames = Object.keys(groupedMessages).sort((a, b) => {
    const aLatest = groupedMessages[a][0]?.created_at || '';
    const bLatest = groupedMessages[b][0]?.created_at || '';
    return bLatest.localeCompare(aLatest);
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Team Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="unread-only"
                checked={showUnreadOnly}
                onCheckedChange={(checked) => setShowUnreadOnly(checked as boolean)}
              />
              <Label htmlFor="unread-only" className="cursor-pointer">
                Unread Only
              </Label>
            </div>

            <div className="md:col-span-2">
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : projectNames.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projectNames.map((projectName) => {
            const projectMessages = groupedMessages[projectName];
            const unreadCount = getUnreadCount(projectName);
            const isExpanded = expandedProjects.has(projectName);
            const displayMessages = isExpanded ? projectMessages : projectMessages.slice(0, 5);

            return (
              <Card key={projectName}>
                <CardHeader className="cursor-pointer" onClick={() => toggleProject(projectName)}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {projectName}
                      {unreadCount > 0 && (
                        <Badge variant="destructive">{unreadCount}</Badge>
                      )}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a href={`/project/${encodeURIComponent(projectName)}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-auto max-h-96">
                    <div className="space-y-3">
                      {displayMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.direction === 'inbound'
                              ? 'bg-muted'
                              : 'bg-primary/10'
                          }`}
                          onClick={() => msg.direction === 'inbound' && !msg.read_at && markAsRead(msg.id)}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={msg.direction === 'inbound' ? 'default' : 'secondary'}>
                                {msg.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                              </Badge>
                              {msg.direction === 'inbound' && !msg.read_at && (
                                <Badge variant="destructive" className="text-xs">New</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {msg.sender_name && (
                            <p className="text-sm font-medium mb-1">
                              {msg.sender_name}
                              {msg.sender_phone && ` (${msg.sender_phone})`}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {projectMessages.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleProject(projectName)}
                      className="w-full"
                    >
                      {isExpanded ? 'Show Less' : `Show ${projectMessages.length - 5} More Messages`}
                    </Button>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyTexts.get(projectName) || ''}
                      onChange={(e) =>
                        setReplyTexts(new Map(replyTexts.set(projectName, e.target.value)))
                      }
                      className="min-h-[60px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleReply(projectName);
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleReply(projectName)}
                      disabled={sendingMap.get(projectName) || !replyTexts.get(projectName)?.trim()}
                      size="icon"
                      className="shrink-0"
                    >
                      {sendingMap.get(projectName) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
