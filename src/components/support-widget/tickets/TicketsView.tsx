import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TicketForm } from './TicketForm';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

interface TicketsViewProps {
  projectName: string;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ projectName }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  const fetchTickets = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, subject, status, priority, created_at')
      .eq('project_name', projectName)
      .eq('created_by_email', user.email)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setTickets(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [projectName, user?.email]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'open':
      case 'in_progress':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (showForm) {
    return (
      <TicketForm 
        projectName={projectName}
        onBack={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          fetchTickets();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">My Tickets</h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No tickets yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a ticket to track your support requests
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create First Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(ticket.status)}
                    <span className="text-xs font-mono text-muted-foreground">
                      {ticket.ticket_number}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium",
                    getPriorityColor(ticket.priority)
                  )}>
                    {ticket.priority.toUpperCase()}
                  </span>
                </div>
                <h4 className="font-medium text-sm text-foreground mb-1 line-clamp-1">
                  {ticket.subject}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getStatusLabel(ticket.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
