import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserAttribution } from '@/hooks/useUserAttribution';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ExternalLink, Loader2, Phone, Mail, FileText, PhoneCall } from 'lucide-react';
import {
  CHANNEL_LABELS, COMPLETION_REASON_LABELS, LOST_TYPE_LABELS, RESULT_LABELS, WORK_STATUS_LABELS,
  followUpCountdown,
  type AttemptResult, type Channel, type CompletionReason, type RecaptureAttempt, type RecaptureCase,
} from './types';

interface InternalNote {
  id: string;
  note_text: string;
  created_by: string;
  created_at: string;
}

interface Props {
  caseRow: RecaptureCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ghlUrl: string | null;
  onOpenPortalRecord: (c: RecaptureCase) => void;
  onChanged: () => void;
}

export default function RecaptureCaseDrawer({ caseRow, open, onOpenChange, ghlUrl, onOpenPortalRecord, onChanged }: Props) {
  const { user } = useAuth();
  const { userName } = useUserAttribution();

  const [attempts, setAttempts] = useState<RecaptureAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Log attempt dialog
  const [attemptOpen, setAttemptOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>('call');
  const [result, setResult] = useState<AttemptResult | ''>('');
  const [attemptNote, setAttemptNote] = useState('');
  const [savingAttempt, setSavingAttempt] = useState(false);

  // Outcome dialog
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeKind, setOutcomeKind] = useState<'nurture' | 'follow_up' | 'completed' | ''>('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [completionReason, setCompletionReason] = useState<CompletionReason | ''>('');
  const [savingOutcome, setSavingOutcome] = useState(false);

  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, [open]);

  const loadAttempts = useCallback(async (caseId: string) => {
    setLoadingAttempts(true);
    const { data, error } = await supabase
      .from('recapture_attempts' as any)
      .select('*')
      .eq('case_id', caseId)
      .order('attempted_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load attempts', variant: 'destructive' });
      setAttempts([]);
    } else {
      setAttempts(((data as any) || []) as RecaptureAttempt[]);
    }
    setLoadingAttempts(false);
  }, []);

  const loadNotes = useCallback(async (appointmentId: string) => {
    const { data } = await supabase
      .from('appointment_notes')
      .select('id, note_text, created_by, created_at')
      .eq('appointment_id', appointmentId)
      .eq('visibility', 'internal')
      .order('created_at', { ascending: false })
      .limit(30);
    setNotes(((data as any) || []) as InternalNote[]);
  }, []);

  useEffect(() => {
    if (!open || !caseRow) return;
    loadAttempts(caseRow.id);
    if (caseRow.appointment_id) loadNotes(caseRow.appointment_id);
    else setNotes([]);
  }, [open, caseRow?.id, loadAttempts, loadNotes]);

  if (!caseRow) return null;

  const countdown = followUpCountdown(caseRow.follow_up_at);

  const resetAttemptForm = () => {
    setChannel('call');
    setResult('');
    setAttemptNote('');
  };

  /** Logging an attempt only ever appends history — it never completes a record. */
  const saveAttempt = async () => {
    if (!result) {
      toast({ title: 'Select an attempt outcome', variant: 'destructive' });
      return;
    }
    setSavingAttempt(true);
    try {
      const { error } = await supabase.from('recapture_attempts' as any).insert({
        case_id: caseRow.id,
        channel,
        result,
        note: attemptNote.trim() || null,
        user_id: user?.id,
        user_name: userName || user?.email,
      });
      if (error) throw error;

      // A brand new record becomes Nurture on its first attempt; anything else stays put.
      if (caseRow.work_status === 'new') {
        await supabase
          .from('recapture_cases' as any)
          .update({ work_status: 'nurture', work_started_at: caseRow.work_started_at || new Date().toISOString() })
          .eq('id', caseRow.id);
      }

      toast({ title: 'Attempt logged', description: `${CHANNEL_LABELS[channel]} — ${RESULT_LABELS[result]}` });
      setAttemptOpen(false);
      resetAttemptForm();
      await loadAttempts(caseRow.id);
      onChanged();
    } catch (e: any) {
      toast({ title: 'Failed to log attempt', description: e.message, variant: 'destructive' });
    }
    setSavingAttempt(false);
  };

  const saveOutcome = async () => {
    if (!outcomeKind) return;
    if (outcomeKind === 'follow_up' && (!followUpDate || !followUpTime)) {
      toast({ title: 'Follow-up date and time are required', variant: 'destructive' });
      return;
    }
    if (outcomeKind === 'completed' && !completionReason) {
      toast({ title: 'Select a completion reason', variant: 'destructive' });
      return;
    }
    if (outcomeKind === 'completed' && completionReason === 'other' && !outcomeNote.trim()) {
      toast({ title: 'A note is required for "Other"', variant: 'destructive' });
      return;
    }

    setSavingOutcome(true);
    try {
      const update: any = { updated_at: new Date().toISOString() };
      if (outcomeKind === 'nurture') {
        update.work_status = 'nurture';
        update.follow_up_at = null;
        update.follow_up_note = null;
        update.work_started_at = caseRow.work_started_at || new Date().toISOString();
        if (outcomeNote.trim()) update.outcome_notes = outcomeNote.trim();
      } else if (outcomeKind === 'follow_up') {
        update.work_status = 'follow_up';
        update.follow_up_at = new Date(`${followUpDate}T${followUpTime}`).toISOString();
        update.follow_up_note = outcomeNote.trim() || null;
        update.work_started_at = caseRow.work_started_at || new Date().toISOString();
      } else {
        update.work_status = 'completed';
        update.completion_reason = completionReason;
        update.outcome = completionReason === 'booked_rescheduled' ? 'rebooked' : completionReason;
        update.outcome_notes = outcomeNote.trim() || null;
        update.completed_at = new Date().toISOString();
        update.completed_by = user?.id;
        update.follow_up_at = null;
        if (completionReason === 'booked_rescheduled') update.recovered = true;
      }

      const { error } = await supabase.from('recapture_cases' as any).update(update).eq('id', caseRow.id);
      if (error) throw error;

      // Mirror the outcome into the patient record as an internal-only note.
      if (caseRow.appointment_id) {
        const label =
          outcomeKind === 'nurture'
            ? 'Nurture'
            : outcomeKind === 'follow_up'
              ? `Follow-Up Required for ${format(new Date(`${followUpDate}T${followUpTime}`), 'MMM d, yyyy h:mm a')}`
              : `Completed — ${COMPLETION_REASON_LABELS[completionReason as CompletionReason]}`;
        await supabase.from('appointment_notes').insert({
          appointment_id: caseRow.appointment_id,
          note_text: `Recapture outcome: ${label}${outcomeNote.trim() ? `. ${outcomeNote.trim()}` : ''} by ${userName || user?.email || 'Portal User'}`,
          created_by: userName || user?.email || 'Portal User',
          visibility: 'internal',
        } as any);
        loadNotes(caseRow.appointment_id);
      }

      toast({ title: 'Outcome saved' });
      setOutcomeOpen(false);
      setOutcomeKind('');
      setOutcomeNote('');
      setCompletionReason('');
      setFollowUpDate('');
      setFollowUpTime('');
      onChanged();
      if (outcomeKind === 'completed') onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Failed to save outcome', description: e.message, variant: 'destructive' });
    }
    setSavingOutcome(false);
  };

  const addNote = async () => {
    if (!caseRow.appointment_id || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const { error } = await supabase.from('appointment_notes').insert({
        appointment_id: caseRow.appointment_id,
        note_text: `${noteText.trim()} by ${userName || user?.email || 'Portal User'}`,
        created_by: userName || user?.email || 'Portal User',
        visibility: 'internal',
      } as any);
      if (error) throw error;
      setNoteText('');
      await loadNotes(caseRow.appointment_id);
      toast({ title: 'Note added' });
    } catch (e: any) {
      toast({ title: 'Failed to add note', description: e.message, variant: 'destructive' });
    }
    setSavingNote(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              {caseRow.patient_name || 'Patient'}
              <Badge variant="outline">{LOST_TYPE_LABELS[caseRow.lost_type]}</Badge>
              <Badge variant="secondary">{WORK_STATUS_LABELS[caseRow.work_status]}</Badge>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setAttemptOpen(true)}>
                <PhoneCall className="h-4 w-4 mr-1" /> Log Attempt
              </Button>
              <Select
                value={outcomeKind || undefined}
                onValueChange={(v) => {
                  setOutcomeKind(v as any);
                  setOutcomeOpen(true);
                }}
              >
                <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Outcome" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nurture">Nurture</SelectItem>
                  <SelectItem value="follow_up">Follow-Up Required</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {caseRow.appointment_id && (
                <Button size="sm" variant="outline" onClick={() => onOpenPortalRecord(caseRow)}>
                  <FileText className="h-4 w-4 mr-1" /> Portal record
                </Button>
              )}
              {ghlUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={ghlUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> GoHighLevel
                  </a>
                </Button>
              )}
            </div>

            {/* Facts */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Clinic</span><div className="font-medium">{caseRow.project_name}</div></div>
              <div><span className="text-muted-foreground">Service Line</span><div className="font-medium">{caseRow.service_line || '—'}</div></div>
              <div>
                <span className="text-muted-foreground">Phone</span>
                <div className="font-medium flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />{caseRow.lead_phone_number || '—'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <div className="font-medium flex items-center gap-1 break-all">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />{caseRow.lead_email || '—'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Last Appointment</span>
                <div className="font-medium">
                  {caseRow.appointment_date ? format(parseISO(caseRow.appointment_date), 'MMM d, yyyy h:mm a') : '—'}
                </div>
              </div>
              <div><span className="text-muted-foreground">Contact Attempts</span><div className="font-medium">{caseRow.attempt_count}</div></div>
              {caseRow.follow_up_at && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Follow-Up</span>
                  <div className={cn('font-medium', countdown?.overdue && 'text-destructive')}>
                    {format(parseISO(caseRow.follow_up_at), 'MMM d, yyyy h:mm a')}
                    {countdown && ` · ${countdown.label}`}
                  </div>
                  {caseRow.follow_up_note && <div className="text-muted-foreground">{caseRow.follow_up_note}</div>}
                </div>
              )}
              {caseRow.work_status === 'completed' && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Completion Reason</span>
                  <div className="font-medium">
                    {caseRow.completion_reason ? COMPLETION_REASON_LABELS[caseRow.completion_reason] : caseRow.outcome || '—'}
                  </div>
                  {caseRow.outcome_notes && <div className="text-muted-foreground">{caseRow.outcome_notes}</div>}
                </div>
              )}
            </div>

            {caseRow.stale && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                This case is stale — the source appointment is no longer in a cancelled/no-show state.
              </div>
            )}

            {/* Attempt history */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Contact Attempt History</h3>
              {loadingAttempts ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : attempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attempts logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {attempts.map((a) => (
                    <div key={a.id} className="rounded-md border p-3 text-sm bg-card">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-medium">
                          {CHANNEL_LABELS[a.channel]}{a.result ? ` — ${RESULT_LABELS[a.result]}` : ''}
                        </span>
                        <span className="text-muted-foreground">
                          {format(parseISO(a.attempted_at), 'MMM d, h:mm a')}{a.user_name ? ` · ${a.user_name}` : ''}
                        </span>
                      </div>
                      {a.note && <div className="mt-1">{a.note}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Internal notes */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Internal Notes</h3>
              {caseRow.appointment_id ? (
                <>
                  <div className="flex gap-2 mb-2">
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add an internal note (never visible to the clinic)..."
                      rows={2}
                    />
                    <Button size="sm" onClick={addNote} disabled={savingNote || !noteText.trim()}>
                      {savingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add
                    </Button>
                  </div>
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No internal notes yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {notes.map((n) => (
                        <div key={n.id} className="rounded-md border p-3 text-sm bg-card">
                          <div className="text-muted-foreground text-xs">
                            {format(parseISO(n.created_at), 'MMM d, yyyy h:mm a')} · {n.created_by}
                          </div>
                          <div className="mt-1 whitespace-pre-wrap">{n.note_text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No linked appointment record.</p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Log Attempt */}
      <Dialog open={attemptOpen} onOpenChange={(o) => { setAttemptOpen(o); if (!o) resetAttemptForm(); }}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Log Contact Attempt</DialogTitle>
            <DialogDescription>
              This records activity only — it never completes the recapture record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Method</label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANNEL_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Attempt outcome</label>
              <Select value={result} onValueChange={(v) => setResult(v as AttemptResult)}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RESULT_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea value={attemptNote} onChange={(e) => setAttemptNote(e.target.value)} placeholder="Context for the next setter..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttemptOpen(false)}>Cancel</Button>
            <Button onClick={saveAttempt} disabled={savingAttempt}>
              {savingAttempt && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Attempt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outcome */}
      <Dialog open={outcomeOpen} onOpenChange={(o) => { setOutcomeOpen(o); if (!o) setOutcomeKind(''); }}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>
              {outcomeKind === 'nurture' ? 'Move to Nurture' : outcomeKind === 'follow_up' ? 'Schedule Follow-Up' : 'Complete Recapture Record'}
            </DialogTitle>
            <DialogDescription>
              {outcomeKind === 'completed'
                ? 'Completing closes the active recapture workflow for this patient.'
                : 'The record stays active and can keep receiving contact attempts.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {outcomeKind === 'follow_up' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Follow-up date</label>
                  <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Follow-up time</label>
                  <Input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} />
                </div>
              </div>
            )}
            {outcomeKind === 'completed' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Completion reason</label>
                <Select value={completionReason} onValueChange={(v) => setCompletionReason(v as CompletionReason)}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMPLETION_REASON_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Note {outcomeKind === 'completed' && completionReason === 'other' ? '(required)' : '(optional)'}
              </label>
              <Textarea value={outcomeNote} onChange={(e) => setOutcomeNote(e.target.value)} placeholder="Context..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutcomeOpen(false)}>Cancel</Button>
            <Button onClick={saveOutcome} disabled={savingOutcome}>
              {savingOutcome && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
