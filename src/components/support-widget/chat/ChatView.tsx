import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatViewProps {
  projectName: string;
  conversationId: string | null;
  onConversationChange: (id: string | null) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  projectName,
  conversationId,
  onConversationChange
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForAgent, setIsWaitingForAgent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your AI assistant. I can help you with questions about appointments, statuses, and using the portal. What would you like to know?",
        timestamp: new Date()
      }]);
    }
  }, []);

  const createConversation = async () => {
    if (conversationId) return conversationId;

    const { data, error } = await supabase
      .from('support_conversations')
      .insert({
        project_name: projectName,
        type: 'ai',
        status: 'active',
        user_email: user?.email,
        user_name: user?.email?.split('@')[0]
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }

    onConversationChange(data.id);
    return data.id;
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    await supabase
      .from('support_messages')
      .insert({
        conversation_id: convId,
        role,
        content
      });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const convId = await createConversation();
      await saveMessage(convId, 'user', userMessage.content);

      // Call AI endpoint
      const { data, error } = await supabase.functions.invoke('support-ai-chat', {
        body: {
          messages: messages.filter(m => m.id !== 'welcome').concat(userMessage).map(m => ({
            role: m.role,
            content: m.content
          })),
          conversationId: convId,
          projectName
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(convId, 'assistant', data.response);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAgent = async () => {
    setIsWaitingForAgent(true);
    
    const systemMessage: Message = {
      id: Date.now().toString() + '-system',
      role: 'system',
      content: "You've requested to speak with a live agent. Our team has been notified and will join the conversation shortly. Average wait time is under 5 minutes.",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, systemMessage]);

    // Get the last user message for context
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();

    try {
      // Create conversation if needed
      const convId = conversationId || await createConversation();

      // Update conversation status
      await supabase
        .from('support_conversations')
        .update({ status: 'waiting_agent' })
        .eq('id', convId);

      // Send Slack notification
      await supabase.functions.invoke('notify-slack-support', {
        body: {
          conversationId: convId,
          projectName,
          userEmail: user?.email,
          userName: user?.email?.split('@')[0],
          lastMessage: lastUserMessage?.content
        }
      });

      console.log('[ChatView] Slack notification sent for agent request');
    } catch (error) {
      console.error('[ChatView] Error requesting agent:', error);
      // Don't show error to user - the system message was still shown
    }

    toast({
      title: 'Agent Requested',
      description: 'A support agent will join your chat shortly.'
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-2",
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              message.role === 'user' 
                ? "bg-primary text-primary-foreground" 
                : message.role === 'system'
                ? "bg-amber-500 text-white"
                : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
            )}>
              {message.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : message.role === 'system' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>

            {/* Message Bubble */}
            <div className={cn(
              "max-w-[75%] rounded-2xl px-4 py-2",
              message.role === 'user' 
                ? "bg-primary text-primary-foreground rounded-br-md"
                : message.role === 'system'
                ? "bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-md"
                : "bg-muted text-foreground rounded-bl-md"
            )}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span className={cn(
                "text-[10px] mt-1 block",
                message.role === 'user' 
                  ? "text-primary-foreground/70" 
                  : "text-muted-foreground"
              )}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Request Agent Button */}
      {!isWaitingForAgent && messages.length > 2 && (
        <div className="px-4 pb-2">
          <button
            onClick={handleRequestAgent}
            className="w-full py-2 text-sm text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors"
          >
            💬 Talk to a live agent
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className={cn(
              "flex-1 px-4 py-2 text-sm rounded-full",
              "bg-muted border border-border",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
              "placeholder:text-muted-foreground",
              "disabled:opacity-50"
            )}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              "p-2 rounded-full transition-colors",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
