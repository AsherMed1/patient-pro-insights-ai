import React, { useState } from 'react';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface TicketFormProps {
  projectName: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const TicketForm: React.FC<TicketFormProps> = ({
  projectName,
  onBack,
  onSuccess
}) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !user?.email) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          project_name: projectName,
          subject: subject.trim(),
          description: description.trim() || null,
          category,
          priority,
          created_by_email: user.email,
          created_by_name: user.email.split('@')[0]
        })
        .select('ticket_number')
        .single();

      if (error) throw error;

      setTicketNumber(data.ticket_number);
      setIsSuccess(true);
      
      toast({
        title: 'Ticket Created',
        description: `Your ticket ${data.ticket_number} has been submitted.`
      });

    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ticket. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-2">
          Ticket Submitted!
        </h3>
        <p className="text-sm text-muted-foreground mb-1">
          Your ticket number is:
        </p>
        <p className="text-lg font-mono font-bold text-primary mb-4">
          {ticketNumber}
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          We'll get back to you as soon as possible.
        </p>
        <button
          onClick={onSuccess}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          View My Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <button
          onClick={onBack}
          className="p-1 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-semibold text-foreground">New Support Ticket</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Subject *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            required
            className={cn(
              "w-full px-3 py-2 text-sm rounded-lg",
              "bg-background border border-border",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={cn(
              "w-full px-3 py-2 text-sm rounded-lg",
              "bg-background border border-border",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            )}
          >
            <option value="general">General Question</option>
            <option value="appointments">Appointments</option>
            <option value="technical">Technical Issue</option>
            <option value="billing">Billing</option>
            <option value="feature">Feature Request</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Priority
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize",
                  priority === p
                    ? p === 'urgent'
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : p === 'high'
                      ? 'bg-orange-100 border-orange-300 text-orange-700'
                      : p === 'medium'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide more details about your issue..."
            rows={4}
            className={cn(
              "w-full px-3 py-2 text-sm rounded-lg resize-none",
              "bg-background border border-border",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            )}
          />
        </div>

        <button
          type="submit"
          disabled={!subject.trim() || isSubmitting}
          className={cn(
            "w-full py-2.5 text-sm font-medium rounded-lg transition-colors",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center justify-center gap-2"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Ticket'
          )}
        </button>
      </form>
    </div>
  );
};
