import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface TeamMessageBubbleProps {
  projectName: string;
}

const TeamMessageBubble = ({ projectName }: TeamMessageBubbleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message before sending.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      
      const { data, error } = await supabase.functions.invoke('send-team-message', {
        body: {
          message: message.trim(),
          project_name: projectName,
          sender_info: {
            source: 'project_portal',
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Failed to Send Message",
          description: error.message || "There was an error sending your message to the team.",
          variant: "destructive",
        });
        return;
      }

      console.log('Message sent successfully:', data);
      
      toast({
        title: "Message Sent!",
        description: "Your message has been sent to the appointment team. They will get back to you soon.",
      });

      setMessage('');
      setIsOpen(false);

    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Failed to Send Message",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating message button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 z-50"
          size="lg"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">Message appointment team</span>
        </Button>
      )}

      {/* Message panel */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-80 max-w-[calc(100vw-2rem)] shadow-xl border z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Message Team
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Send a message to the appointment team for <strong>{projectName}</strong>
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={4}
              className="resize-none"
              disabled={sending}
            />
            
            <div className="flex gap-2">
              <Button
                onClick={handleSendMessage}
                disabled={sending || !message.trim()}
                className="flex-1"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setMessage('');
                  setIsOpen(false);
                }}
                disabled={sending}
              >
                Cancel
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Your message will be sent directly to the appointment team and they will respond as soon as possible.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default TeamMessageBubble;