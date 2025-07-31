import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, X, Send, Loader2, Search, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface TeamMessageBubbleProps {
  projectName: string;
}

interface Patient {
  id: string;
  lead_name: string;
  phone_number?: string;
  contact_id?: string;
  email?: string;
}

const TeamMessageBubble = ({ projectName }: TeamMessageBubbleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  // Search for patients
  const searchPatients = async (search: string) => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('new_leads')
        .select('id, lead_name, phone_number, contact_id, email')
        .eq('project_name', projectName)
        .or(`lead_name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPatients(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, projectName]);

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
          patient_reference: selectedPatient ? {
            name: selectedPatient.lead_name,
            phone: selectedPatient.phone_number,
            contact_id: selectedPatient.contact_id,
            email: selectedPatient.email
          } : null,
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
      setSelectedPatient(null);
      setSearchTerm('');
      setSearchResults([]);
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
        <Card className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] shadow-xl border z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Message Team
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  setMessage('');
                  setSelectedPatient(null);
                  setSearchTerm('');
                  setSearchResults([]);
                }}
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
            {/* Patient Search Section */}
            <div className="space-y-2">
              <Label htmlFor="patient-search" className="text-sm font-medium">
                Reference Patient (Optional)
              </Label>
              
              {selectedPatient ? (
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md border">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <div className="text-sm">
                      <div className="font-medium">{selectedPatient.lead_name}</div>
                      {selectedPatient.phone_number && (
                        <div className="text-gray-600">{selectedPatient.phone_number}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSearchTerm('');
                      setSearchResults([]);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="patient-search"
                    placeholder="Search by name, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={sending}
                  />
                  
                  {/* Search Results Dropdown */}
                  {(searchResults.length > 0 || searching) && searchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                      {searching ? (
                        <div className="p-2 text-sm text-gray-500 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching...
                        </div>
                      ) : (
                        <>
                          <button
                            className="w-full text-left p-2 hover:bg-gray-50 text-sm border-b"
                            onClick={() => {
                              setSelectedPatient(null);
                              setSearchTerm('');
                              setSearchResults([]);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <X className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">No patient reference</span>
                            </div>
                          </button>
                          {searchResults.map((patient) => (
                            <button
                              key={patient.id}
                              className="w-full text-left p-2 hover:bg-gray-50 text-sm"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setSearchTerm('');
                                setSearchResults([]);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-600" />
                                <div>
                                  <div className="font-medium">{patient.lead_name}</div>
                                  {patient.phone_number && (
                                    <div className="text-gray-600 text-xs">{patient.phone_number}</div>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Message Text Area */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={4}
                className="resize-none"
                disabled={sending}
              />
            </div>
            
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
                  setSelectedPatient(null);
                  setSearchTerm('');
                  setSearchResults([]);
                  setIsOpen(false);
                }}
                disabled={sending}
              >
                Cancel
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Your message will be sent directly to the appointment team and they will respond as soon as possible.
              {selectedPatient && (
                <span className="block mt-1 text-blue-600">
                  Referenced patient: {selectedPatient.lead_name}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default TeamMessageBubble;