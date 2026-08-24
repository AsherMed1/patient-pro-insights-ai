import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PhoneCall, PhoneOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserAttribution } from '@/hooks/useUserAttribution';

export type WelcomeCallState = 'none' | 'attempted' | 'reached';

export const WELCOME_CALL_STATE_LABELS: Record<WelcomeCallState, string> = {
  none: 'No Welcome Call Attempt Logged',
  attempted: 'Welcome Call — Attempted, Not Reached',
  reached: 'Welcome Call — Successfully Reached',
};

export interface WelcomeCallAttempt {
  id: string;
  appointment_id: string;
  attempted_at: string;
  outcome: string;
  note: string | null;
  user_name: string | null;
}

interface WelcomeCallAttemptDialogProps {
  appointmentId: string;
  patientName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogged?: (outcome: 'answered' | 'no_answer') => void;
}

export const WelcomeCallAttemptDialog: React.FC<WelcomeCallAttemptDialogProps> = ({
  appointmentId, patientName, open, onOpenChange, onLogged,
}) => {
  const { toast } = useToast();
  const { userId, userName } = useUserAttribution();
  const [outcome, setOutcome] = useState<'answered' | 'no_answer'>('no_answer');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<WelcomeCallAttempt[]>([]);

  useEffect(() => {
    if (!open) return;
    setOutcome('no_answer');
    setNote('');
    (async () => {
      const { data } = await supabase
        .from('appointment_contact_attempts')
        .select('*')
        .eq('appointment_id', appointmentId)
        .eq('source', 'welcome_call')
        .order('attempted_at', { ascending: false })
        .limit(20);
      setHistory((data || []) as unknown as WelcomeCallAttempt[]);
    })();
  }, [open, appointmentId]);

  const handleSubmit = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const attemptedAt = new Date().toISOString();
      const { error } = await supabase.from('appointment_contact_attempts').insert({
        appointment_id: appointmentId,
        attempted_at: attemptedAt,
        channel: 'call',
        outcome,
        note: note.trim(),
        user_id: userId,
        user_name: userName,
        source: 'welcome_call',
      });
      if (error) throw error;

      const outcomeLabel = outcome === 'answered' ? 'Patient Answered' : 'Patient Did Not Answer';
      await supabase.from('appointment_notes').insert({
        appointment_id: appointmentId,
        note_text: `Welcome Call attempt: ${outcomeLabel}. ${note.trim()} by ${userName}`,
        created_by: userName,
        visibility: 'internal',
      } as any);

      if (outcome === 'no_answer') {
        try {
          const { data, error: fnErr } = await supabase.functions.invoke('trigger-welcome-call-sms', {
            body: { appointment_id: appointmentId },
          });
          if (fnErr) throw fnErr;
          if ((data as any)?.success === false) {
            throw new Error((data as any)?.error || 'GHL tag could not be applied');
          }
          if ((data as any)?.suppressed) {
            toast({
              title: 'Attempt logged',
              description: 'Patient was already tagged for Welcome Call follow-up in the last 12 hours.',
            });
          } else {
            toast({
              title: 'Attempt logged',
              description: 'Patient tagged in GHL for Welcome Call follow-up.',
            });
          }
        } catch (e: any) {
          console.error('Welcome Call GHL tag failed', e);
          toast({
            title: 'Attempt logged',
            description: `The attempt was saved, but the GHL follow-up tag could not be applied.${e?.message ? ` (${e.message})` : ''}`,
            variant: 'destructive',
          });
        }

      } else {
        toast({ title: 'Attempt logged', description: 'Marked as successfully reached.' });
      }

      onOpenChange(false);
      onLogged?.(outcome);
    } catch (e: any) {
      console.error('Failed to log Welcome Call attempt', e);
      toast({
        title: 'Could not log attempt',
        description: e?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Welcome Call attempt</DialogTitle>
          <DialogDescription>
            {patientName
              ? `Document a Welcome Call to ${patientName}. This does not change the appointment.`
              : 'Document a Welcome Call. This does not change the appointment.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Outreach method</label>
            <div className="mt-1">
              <Badge variant="secondary" className="gap-1">
                <PhoneCall className="h-3 w-3" /> Call
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Outcome</label>
            <RadioGroup
              value={outcome}
              onValueChange={(v) => setOutcome(v as 'answered' | 'no_answer')}
              className="mt-2 space-y-2"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="answered" id="wc-answered" />
                Patient Answered
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="no_answer" id="wc-no-answer" />
                Patient Did Not Answer
              </label>
            </RadioGroup>
            {outcome === 'no_answer' && (
              <p className="text-xs text-muted-foreground mt-2">
                A Welcome Call text message will be sent to the patient (max once every 12 hours).
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Internal note (required)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Called at 10:15am, no answer, left voicemail"
              rows={3}
            />
          </div>

          {history.length > 0 && (
            <div className="border-t pt-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Previous Welcome Call attempts ({history.length})
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {history.map(h => (
                  <div key={h.id} className="text-xs bg-muted/50 rounded px-2 py-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {h.outcome === 'answered' ? 'Answered' : 'Did not answer'}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(h.attempted_at).toLocaleString()}
                        {h.user_name ? ` · ${h.user_name}` : ''}
                      </span>
                    </div>
                    {h.note && <div className="text-muted-foreground mt-0.5">{h.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !note.trim()}>
            {saving ? 'Saving...' : 'Log attempt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface WelcomeCallAttemptControlProps {
  appointmentId: string;
  patientName?: string | null;
  /** PPM/internal users see the "No Attempt Logged" state; clinics do not. */
  showEmptyState?: boolean;
}

/** Badge + button pair used in the notes header. */
export const WelcomeCallAttemptControl: React.FC<WelcomeCallAttemptControlProps> = ({
  appointmentId, patientName, showEmptyState = true,
}) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<WelcomeCallState>('none');
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('all_appointments')
      .select('welcome_call_state, welcome_call_attempt_count')
      .eq('id', appointmentId)
      .maybeSingle();
    if (data) {
      setState(((data as any).welcome_call_state || 'none') as WelcomeCallState);
      setCount((data as any).welcome_call_attempt_count || 0);
    }
  }, [appointmentId]);

  useEffect(() => { load(); }, [load]);

  const badge = () => {
    if (state === 'reached') {
      return (
        <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> Welcome Call reached
        </Badge>
      );
    }
    if (state === 'attempted') {
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
          <PhoneOff className="h-3 w-3" /> Attempted, not reached ({count})
        </Badge>
      );
    }
    if (!showEmptyState) return null;
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <PhoneOff className="h-3 w-3" /> No Welcome Call logged
      </Badge>
    );
  };

  return (
    <>
      {badge()}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center space-x-1"
      >
        <PhoneCall className="h-3 w-3" />
        <span>Welcome Call attempt</span>
      </Button>
      <WelcomeCallAttemptDialog
        appointmentId={appointmentId}
        patientName={patientName}
        open={open}
        onOpenChange={setOpen}
        onLogged={() => load()}
      />
    </>
  );
};

export default WelcomeCallAttemptDialog;
