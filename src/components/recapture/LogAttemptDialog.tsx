import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import BookedBySelect from './BookedBySelect';
import {
  CHANNEL_LABELS, CONVERSATION_OUTCOMES, CONVERSATION_OUTCOME_LABELS, CONTACT_RESULTS,
  RESULTS_BY_CHANNEL, RESULT_LABELS, SCHEDULING_OUTCOMES, TEXT_FLAT_OPTIONS,
  type AttemptResult, type Channel, type ConversationOutcome,
} from './types';

export interface AttemptPayload {
  channel: Channel;
  result: AttemptResult;
  conversationOutcome: ConversationOutcome | null;
  /** For the "Other" conversation outcome the setter picks what happens next. */
  otherResolution: 'follow_up' | 'completed' | null;
  bookedByUserId: string | null;
  bookedByName: string | null;
  note: string;
  /** True when the Schedule Follow-Up modal must run before saving. */
  needsScheduling: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  currentUserId?: string | null;
  currentUserName?: string | null;
  onSubmit: (payload: AttemptPayload) => void;
}

const METHODS: Channel[] = ['call', 'text', 'email'];

/**
 * Method → Attempt Outcome → Conversation Outcome. Logging an attempt only ever
 * appends history; completion is driven by the conversation outcome.
 */
export default function LogAttemptDialog({
  open, onOpenChange, saving, currentUserId, currentUserName, onSubmit,
}: Props) {
  const [channel, setChannel] = useState<Channel>('call');
  const [result, setResult] = useState<AttemptResult | ''>('');
  const [conversation, setConversation] = useState<ConversationOutcome | ''>('');
  const [otherResolution, setOtherResolution] = useState<'follow_up' | 'completed' | ''>('');
  const [bookedById, setBookedById] = useState('');
  const [bookedByName, setBookedByName] = useState('');
  const [note, setNote] = useState('');
  const [flatTextValue, setFlatTextValue] = useState('');

  useEffect(() => {
    if (!open) return;
    setChannel('call');
    setResult('');
    setConversation('');
    setOtherResolution('');
    setNote('');
    setFlatTextValue('');
    setBookedById(currentUserId || '');
    setBookedByName(currentUserName || '');
  }, [open, currentUserId, currentUserName]);

  const isTextFlat = channel === 'text';
  const reached = !!result && CONTACT_RESULTS.includes(result as AttemptResult);
  const isWrongNumber = result === 'wrong_number';
  const needsBookedBy = reached && conversation === 'booked_rescheduled';
  const needsNote = reached && conversation === 'other';

  const handleFlatTextChange = (value: string) => {
    const opt = TEXT_FLAT_OPTIONS.find(o => o.value === value);
    if (!opt) return;
    setFlatTextValue(value);
    setResult(opt.result);
    setConversation(opt.conversationOutcome || '');
    setOtherResolution('');
  };

  const submit = () => {
    if (!result) {
      toast({ title: 'Select an attempt outcome', variant: 'destructive' });
      return;
    }
    if (reached && !conversation) {
      toast({ title: 'A conversation outcome is required', variant: 'destructive' });
      return;
    }
    if (needsBookedBy && !bookedById) {
      toast({ title: 'Select who booked / rescheduled the patient', variant: 'destructive' });
      return;
    }
    if (needsNote && !note.trim()) {
      toast({ title: 'A note is required for "Other"', variant: 'destructive' });
      return;
    }
    if (needsNote && !otherResolution) {
      toast({ title: 'Choose whether follow-up is required or the record is complete', variant: 'destructive' });
      return;
    }

    const needsScheduling =
      reached &&
      (SCHEDULING_OUTCOMES.includes(conversation as ConversationOutcome) ||
        (conversation === 'other' && otherResolution === 'follow_up'));

    onSubmit({
      channel,
      result: result as AttemptResult,
      conversationOutcome: reached ? (conversation as ConversationOutcome) : null,
      otherResolution: conversation === 'other' ? (otherResolution as 'follow_up' | 'completed') : null,
      bookedByUserId: needsBookedBy ? bookedById : null,
      bookedByName: needsBookedBy ? bookedByName : null,
      note: note.trim(),
      needsScheduling,
    });
  };

  const needsScheduling =
    reached &&
    (SCHEDULING_OUTCOMES.includes(conversation as ConversationOutcome) ||
      (conversation === 'other' && otherResolution === 'follow_up'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Log Contact Attempt</DialogTitle>
          <DialogDescription>
            Logging an attempt records activity only — it never completes the record on its own.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Method</label>
            <Select
              value={channel}
              onValueChange={(v) => { setChannel(v as Channel); setResult(''); setConversation(''); setOtherResolution(''); setFlatTextValue(''); }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => <SelectItem key={m} value={m}>{CHANNEL_LABELS[m]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Attempt outcome</label>
            <Select
              value={result || undefined}
              onValueChange={(v) => { setResult(v as AttemptResult); setConversation(''); setOtherResolution(''); }}
            >
              <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
              <SelectContent>
                {RESULTS_BY_CHANNEL[channel].map((r) => (
                  <SelectItem key={r} value={r}>{RESULT_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isWrongNumber && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <span>
                Wrong Number completes this record as <strong>Invalid / Wrong Number</strong> and removes the
                patient from future recapture and reschedule outreach.
              </span>
            </div>
          )}

          {reached && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Conversation outcome (required)</label>
              <Select
                value={conversation || undefined}
                onValueChange={(v) => { setConversation(v as ConversationOutcome); setOtherResolution(''); }}
              >
                <SelectTrigger><SelectValue placeholder="Select conversation outcome" /></SelectTrigger>
                <SelectContent>
                  {CONVERSATION_OUTCOMES.map((c) => (
                    <SelectItem key={c} value={c}>{CONVERSATION_OUTCOME_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsBookedBy && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Booked / Rescheduled By (required)</label>
              <BookedBySelect
                value={bookedById}
                onChange={(id, name) => { setBookedById(id); setBookedByName(name); }}
              />
              <p className="text-xs text-muted-foreground">
                Credit goes to the setter who actually booked or rescheduled the patient.
              </p>
            </div>
          )}

          {needsNote && (
            <div className="space-y-2">
              <label className="text-sm font-medium">What happens next? (required)</label>
              <RadioGroup
                value={otherResolution || ''}
                onValueChange={(v) => setOtherResolution(v as 'follow_up' | 'completed')}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="follow_up" id="other-followup" />
                  <label htmlFor="other-followup" className="text-sm">Follow-up required — keep the record active</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="completed" id="other-completed" />
                  <label htmlFor="other-completed" className="text-sm">Completed — close the record with this note</label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">Note {needsNote ? '(required)' : '(optional)'}</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Context for the next setter..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {needsScheduling ? 'Continue' : 'Save Attempt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
