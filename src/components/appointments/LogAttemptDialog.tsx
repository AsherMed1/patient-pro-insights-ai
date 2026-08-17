import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserAttribution } from '@/hooks/useUserAttribution';

export const ATTEMPT_CHANNELS: { value: string; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'voicemail', label: 'Voicemail' },
];

export const ATTEMPT_OUTCOMES: { value: string; label: string }[] = [
  { value: 'no_answer', label: 'No answer' },
  { value: 'left_voicemail', label: 'Left voicemail' },
  { value: 'reached_patient', label: 'Reached patient' },
  { value: 'wrong_number', label: 'Wrong number' },
  { value: 'callback_requested', label: 'Callback requested' },
];

export const channelLabel = (v?: string | null) =>
  ATTEMPT_CHANNELS.find(c => c.value === v)?.label || v || 'Contact';
export const outcomeLabel = (v?: string | null) =>
  ATTEMPT_OUTCOMES.find(o => o.value === v)?.label || v || '';

export interface ContactAttempt {
  id: string;
  appointment_id: string;
  attempted_at: string;
  channel: string;
  outcome: string;
  note: string | null;
  user_name: string | null;
  source: string;
}

interface LogAttemptDialogProps {
  appointmentId: string;
  patientName?: string | null;
  /** Other appointment rows for the same patient, so history follows the patient. */
  siblingIds?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogged?: (attempt: {
    appointment_id: string;
    attempted_at: string;
    channel: string;
    outcome: string;
    note: string | null;
    user_name: string | null;
  }) => void;
}

const LogAttemptDialog: React.FC<LogAttemptDialogProps> = ({
  appointmentId, patientName, siblingIds, open, onOpenChange, onLogged,
}) => {
  const { toast } = useToast();
  const { userId, userName } = useUserAttribution();
  const [channel, setChannel] = useState('call');
  const [outcome, setOutcome] = useState('no_answer');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<ContactAttempt[]>([]);

  useEffect(() => {
    if (!open) return;
    setChannel('call');
    setOutcome('no_answer');
    setNote('');
    (async () => {
      const ids = Array.from(new Set([appointmentId, ...(siblingIds || [])]));
      const { data } = await supabase
        .from('appointment_contact_attempts')
        .select('*')
        .in('appointment_id', ids)
        .order('attempted_at', { ascending: false })
        .limit(20);
      setHistory((data || []) as ContactAttempt[]);
    })();
  }, [open, appointmentId, siblingIds]);


  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('appointment_contact_attempts').insert({
        appointment_id: appointmentId,
        channel,
        outcome,
        note: note.trim() || null,
        user_id: userId,
        user_name: userName,
        source: 'manual',
      });
      if (error) throw error;

      // Mirror into the notes timeline so the next setter sees the context
      const mirrored = `Contact attempt: ${channelLabel(channel)} — ${outcomeLabel(outcome)}${note.trim() ? `. ${note.trim()}` : ''} by ${userName}`;
      await supabase.from('appointment_notes').insert({
        appointment_id: appointmentId,
        note_text: mirrored,
        created_by: userName,
        visibility: 'internal',
      } as any);

      toast({ title: 'Attempt logged', description: `${channelLabel(channel)} — ${outcomeLabel(outcome)}` });
      onOpenChange(false);
      onLogged?.();
    } catch (e: any) {
      console.error('Failed to log contact attempt', e);
      toast({ title: 'Could not log attempt', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log contact attempt</DialogTitle>
          <DialogDescription>
            {patientName ? `Record an outreach attempt for ${patientName}.` : 'Record an outreach attempt for this patient.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Channel</label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ATTEMPT_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Outcome</label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ATTEMPT_OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Note for the next setter (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Patient asked to be called back after 5pm"
              rows={3}
            />
          </div>

          {history.length > 0 && (
            <div className="border-t pt-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Previous attempts ({history.length})
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {history.map(h => (
                  <div key={h.id} className="text-xs bg-muted/50 rounded px-2 py-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {channelLabel(h.channel)}
                      </Badge>
                      <span>{outcomeLabel(h.outcome)}</span>
                      <span className="text-muted-foreground">
                        {new Date(h.attempted_at).toLocaleString()}
                        {h.user_name ? ` · ${h.user_name}` : ''}
                        {h.source === 'ghl_call' ? ' · GHL call' : ''}
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
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Log attempt'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogAttemptDialog;
