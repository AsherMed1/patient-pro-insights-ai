import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserAttribution } from '@/hooks/useUserAttribution';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronRight, ExternalLink, FileText, Loader2, Mail, Phone, PhoneCall,
} from 'lucide-react';
import MentionTextarea from '@/components/admin/MentionTextarea';
import { parseMentions, renderNoteWithMentions, stripMentionTokens } from '@/lib/mentions';
import {
  NOTE_AUTHOR_BADGE_CLASSES, NOTE_AUTHOR_CLASSES, NOTE_AUTHOR_LABELS,
  classifyNoteAuthor, withoutGhlTagNoise,
} from '@/lib/noteStyles';
import { DEFAULT_CLINIC_TZ, formatClinicTime, timezoneLabel } from '@/lib/clinicTime';
import { fetchProjectTimezone, getCachedProjectTimezone } from '@/utils/projectTimezoneCache';
import LogAttemptDialog, { type AttemptPayload } from './LogAttemptDialog';
import ScheduleFollowUpDialog from './ScheduleFollowUpDialog';
import {
  CHANNEL_LABELS, COMPLETION_REASON_LABELS, CONVERSATION_OUTCOME_LABELS, LOST_TYPE_LABELS,
  RESULT_LABELS, WORK_STATUS_LABELS, followUpCountdown,
  type CompletionReason, type RecaptureAttempt, type RecaptureCase, type WorkStatus,
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
  /** Live patch of the row in the queue so counts and buckets follow along. */
  onCasePatched?: (id: string, patch: Partial<RecaptureCase>) => void;
}

function Section({
  title, count, open, onToggle, children,
}: {
  title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="mb-2 flex w-full items-center gap-1.5 text-left text-sm font-semibold"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title} ({count})
      </button>
      {open && children}
    </div>
  );
}

export default function RecaptureCaseDrawer({
  caseRow, open, onOpenChange, ghlUrl, onOpenPortalRecord, onChanged, onCasePatched,
}: Props) {
  const { user } = useAuth();
  const { userName } = useUserAttribution();
  const actor = userName || user?.email || 'Portal User';

  const [row, setRow] = useState<RecaptureCase | null>(caseRow);
  const [attempts, setAttempts] = useState<RecaptureAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);
  const [timezone, setTimezone] = useState<string>(
    getCachedProjectTimezone(caseRow?.project_name) || DEFAULT_CLINIC_TZ,
  );

  const [attemptOpen, setAttemptOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [pending, setPending] = useState<AttemptPayload | null>(null);
  const [saving, setSaving] = useState(false);

  const openStamped = useRef<string | null>(null);

  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => { setRow(caseRow); }, [caseRow]);

  useEffect(() => {
    if (!caseRow?.project_name) return;
    fetchProjectTimezone(caseRow.project_name).then(setTimezone);
  }, [caseRow?.project_name]);

  const patch = useCallback((update: Partial<RecaptureCase>) => {
    setRow((prev) => (prev ? { ...prev, ...update } : prev));
    if (caseRow) onCasePatched?.(caseRow.id, update);
  }, [caseRow, onCasePatched]);

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
      .limit(50);
    setNotes(withoutGhlTagNoise(((data as any) || []) as InternalNote[]));
  }, []);

  /** Opening a record is an activity stamp — it is not an attempt or an outcome. */
  const stampOpened = useCallback(async (c: RecaptureCase) => {
    if (openStamped.current === c.id) return;
    openStamped.current = c.id;
    const now = new Date().toISOString();
    const update: any = { opened_at: c.opened_at || now, opened_by: user?.id, opened_by_name: actor };
    // New (never opened) records move to Opened; anything further along stays put.
    if (c.work_status === 'new') update.work_status = 'opened';
    const { error } = await supabase.from('recapture_cases' as any).update(update).eq('id', c.id);
    if (!error) {
      void logRecaptureActivity({
        caseId: c.id,
        activityType: c.work_status === 'completed' ? 'reopened' : 'opened',
        description: c.work_status === 'completed' ? 'Completed record reopened' : 'Record opened',
        actorUserId: user?.id || null,
        actorName: actor,
      });
      patch({
        opened_at: update.opened_at,
        opened_by: user?.id || null,
        opened_by_name: actor,
        ...(update.work_status ? { work_status: 'opened' as WorkStatus } : {}),
      });
    }
  }, [user?.id, actor, patch]);

  useEffect(() => {
    if (!open || !caseRow) return;
    loadAttempts(caseRow.id);
    if (caseRow.appointment_id) loadNotes(caseRow.appointment_id);
    else setNotes([]);
    stampOpened(caseRow);
  }, [open, caseRow?.id, loadAttempts, loadNotes, stampOpened]);

  useEffect(() => { if (!open) openStamped.current = null; }, [open]);

  if (!row) return null;

  const countdown = followUpCountdown(row.follow_up_at);

  const notifyMentions = async (text: string, appointmentId: string | null, noteId: string | null) => {
    const mentions = parseMentions(text);
    if (mentions.length === 0) return;
    const rows = mentions
      .filter((m) => m.userId !== user?.id)
      .map((m) => ({
        mentioned_user_id: m.userId,
        mentioned_by_user_id: user?.id,
        mentioned_by_name: actor,
        kind: 'recapture_mention',
        title: `${actor} mentioned you on a Recapture record`,
        body: stripMentionTokens(text).slice(0, 300),
        appointment_id: appointmentId,
        appointment_note_id: noteId,
        recapture_case_id: row.id,
      }));
    if (rows.length === 0) return;
    const { error } = await supabase.from('qa_note_mentions' as any).insert(rows as any);
    if (error) console.warn('[recapture] mention notify failed', error.message);
  };

  const writeInternalNote = async (text: string) => {
    if (!row.appointment_id) return null;
    const { data, error } = await supabase
      .from('appointment_notes')
      .insert({
        appointment_id: row.appointment_id,
        note_text: text,
        created_by: actor,
        visibility: 'internal',
      } as any)
      .select('id')
      .maybeSingle();
    if (error) {
      console.warn('[recapture] note write failed', error.message);
      return null;
    }
    return (data as any)?.id || null;
  };

  /** Blocks a patient from all future recapture / reschedule outreach. */
  const blockFutureOutreach = async (reason: string) => {
    const { error } = await supabase.from('patient_reschedule_blocks' as any).insert({
      ghl_contact_id: row.ghl_contact_id,
      project_name: row.project_name,
      patient_name: row.patient_name,
      lead_phone_number: row.lead_phone_number || null,
      source_appointment_id: row.appointment_id,
      reason,
      blocked_by: actor,
      is_active: true,
    } as any);
    if (error) console.warn('[recapture] reschedule block failed', error.message);
  };

  const handleAttemptSubmit = (payload: AttemptPayload) => {
    if (payload.needsScheduling) {
      setPending(payload);
      setAttemptOpen(false);
      setFollowUpOpen(true);
      return;
    }
    void persist(payload, null);
  };

  const persist = async (
    payload: AttemptPayload,
    followUp: { followUpAtIso: string; timezone: string; note: string } | null,
  ) => {
    setSaving(true);
    const previous = { ...row };
    try {
      const now = new Date().toISOString();
      const { error: attemptError } = await supabase.from('recapture_attempts' as any).insert({
        case_id: row.id,
        channel: payload.channel,
        result: payload.result,
        conversation_outcome: payload.conversationOutcome,
        booked_by_user_id: payload.bookedByUserId,
        booked_by_name: payload.bookedByName,
        note: payload.note || followUp?.note || null,
        attempted_at: now,
        user_id: user?.id,
        user_name: actor,
      });
      if (attemptError) throw attemptError;

      const update: any = {
        updated_at: now,
        work_started_at: row.work_started_at || now,
        conversation_outcome: payload.conversationOutcome,
      };
      let statusLabel = '';

      if (followUp) {
        update.work_status = 'follow_up';
        update.follow_up_at = followUp.followUpAtIso;
        update.follow_up_timezone = followUp.timezone;
        update.follow_up_note = followUp.note || payload.note || null;
        statusLabel = `Follow-Up scheduled for ${formatClinicTime(followUp.followUpAtIso, followUp.timezone)}`;
      } else if (payload.result === 'wrong_number') {
        update.work_status = 'completed';
        update.completion_reason = 'wrong_number' as CompletionReason;
        update.outcome = 'wrong_number';
        update.completed_at = now;
        update.completed_by = user?.id;
        update.follow_up_at = null;
        statusLabel = 'Completed — Invalid / Wrong Number';
      } else if (payload.conversationOutcome === 'booked_rescheduled') {
        update.work_status = 'completed';
        update.completion_reason = 'booked_rescheduled' as CompletionReason;
        update.outcome = 'rebooked';
        update.recovered = true;
        update.booked_by_user_id = payload.bookedByUserId;
        update.booked_by_name = payload.bookedByName;
        update.completed_at = now;
        update.completed_by = user?.id;
        update.follow_up_at = null;
        statusLabel = `Completed — Booked / Rescheduled by ${payload.bookedByName}`;
      } else if (payload.conversationOutcome === 'not_interested') {
        update.work_status = 'completed';
        update.completion_reason = 'not_interested' as CompletionReason;
        update.outcome = 'not_interested';
        update.completed_at = now;
        update.completed_by = user?.id;
        update.follow_up_at = null;
        statusLabel = 'Completed — Not Interested';
      } else if (payload.conversationOutcome === 'other' && payload.otherResolution === 'completed') {
        update.work_status = 'completed';
        update.completion_reason = 'other' as CompletionReason;
        update.outcome = 'other';
        update.outcome_notes = payload.note;
        update.completed_at = now;
        update.completed_by = user?.id;
        update.follow_up_at = null;
        statusLabel = 'Completed — Other';
      } else {
        // Attempt with no successful contact: the record works through Nurture.
        update.work_status = 'nurture';
        statusLabel = 'Nurture';
      }

      if (payload.note) update.outcome_notes = payload.note;

      const { error: caseError } = await supabase
        .from('recapture_cases' as any)
        .update(update)
        .eq('id', row.id);
      if (caseError) throw caseError;

      if (update.work_status === 'completed' &&
        (payload.result === 'wrong_number' || payload.conversationOutcome === 'not_interested')) {
        await blockFutureOutreach(
          payload.result === 'wrong_number' ? 'Recapture: invalid / wrong number' : 'Recapture: not interested',
        );
      }

      // Push do-not-reschedule tag to GHL when the patient is marked Not Interested
      // so clinic GHL workflows halt further outreach. Fire-and-forget, non-blocking.
      if (payload.conversationOutcome === 'not_interested' && row.appointment_id) {
        try {
          const { data: appt } = await supabase
            .from('all_appointments')
            .select('ghl_id, project_name')
            .eq('id', row.appointment_id)
            .maybeSingle();
          if (appt?.ghl_id) {
            const { data: proj } = await supabase
              .from('projects')
              .select('ghl_api_key')
              .eq('project_name', appt.project_name)
              .maybeSingle();
            supabase.functions.invoke('update-ghl-contact-tags', {
              body: {
                ghl_contact_id: appt.ghl_id,
                ghl_api_key: proj?.ghl_api_key || undefined,
                tags: ['do-not-reschedule'],
                action: 'add',
                source: 'recapture not-interested',
              },
            }).catch((e) => console.warn('[recapture] do-not-reschedule tag push failed', e));
          }
        } catch (e) {
          console.warn('[recapture] do-not-reschedule tag lookup failed', e);
        }
      }

      // Only after the backend confirms do we move the visible outcome.
      patch({
        work_status: update.work_status,
        conversation_outcome: update.conversation_outcome ?? null,
        follow_up_at: update.follow_up_at ?? null,
        follow_up_timezone: update.follow_up_timezone ?? row.follow_up_timezone,
        follow_up_note: update.follow_up_note ?? row.follow_up_note,
        completion_reason: update.completion_reason ?? row.completion_reason,
        outcome: update.outcome ?? row.outcome,
        outcome_notes: update.outcome_notes ?? row.outcome_notes,
        booked_by_name: update.booked_by_name ?? row.booked_by_name,
        booked_by_user_id: update.booked_by_user_id ?? row.booked_by_user_id,
        recovered: update.recovered ?? row.recovered,
        completed_at: update.completed_at ?? row.completed_at,
        attempt_count: (row.attempt_count || 0) + 1,
        last_attempt_at: now,
      });

      const attemptLine =
        `Recapture ${CHANNEL_LABELS[payload.channel]} attempt — ${RESULT_LABELS[payload.result]}` +
        (payload.conversationOutcome
          ? ` · ${CONVERSATION_OUTCOME_LABELS[payload.conversationOutcome]}`
          : '') +
        (statusLabel ? `. ${statusLabel}` : '') +
        (payload.note ? `. ${payload.note}` : '') +
        ` by ${actor}`;
      await writeInternalNote(attemptLine);

      toast({ title: 'Outcome saved', description: statusLabel || undefined });
      setAttemptOpen(false);
      setFollowUpOpen(false);
      setPending(null);
      await loadAttempts(row.id);
      if (row.appointment_id) await loadNotes(row.appointment_id);
      onChanged();
    } catch (e: any) {
      setRow(previous as RecaptureCase);
      toast({ title: 'Failed to save outcome', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!row.appointment_id || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const text = `${noteText.trim()} by ${actor}`;
      const noteId = await writeInternalNote(text);
      await notifyMentions(noteText, row.appointment_id, noteId);
      setNoteText('');
      await loadNotes(row.appointment_id);
      toast({ title: 'Note added' });
    } catch (e: any) {
      toast({ title: 'Failed to add note', description: e.message, variant: 'destructive' });
    }
    setSavingNote(false);
  };

  const activityCount = attempts.length + (row.opened_at ? 1 : 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto bg-background sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex flex-wrap items-center gap-2">
              {row.patient_name || 'Patient'}
              <Badge variant="outline">{LOST_TYPE_LABELS[row.lost_type]}</Badge>
              <Badge variant="secondary">{WORK_STATUS_LABELS[row.work_status]}</Badge>
              {row.work_status === 'follow_up' && countdown && (
                <Badge variant={countdown.overdue ? 'destructive' : 'outline'}>{countdown.short}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 py-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setAttemptOpen(true)}>
                <PhoneCall className="mr-1 h-4 w-4" /> Log Attempt
              </Button>
              {row.appointment_id && (
                <Button size="sm" variant="outline" onClick={() => onOpenPortalRecord(row)}>
                  <FileText className="mr-1 h-4 w-4" /> Portal record
                </Button>
              )}
              {ghlUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={ghlUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-4 w-4" /> GoHighLevel
                  </a>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Clinic</span><div className="font-medium">{row.project_name}</div></div>
              <div><span className="text-muted-foreground">Service Line</span><div className="font-medium">{row.service_line || '—'}</div></div>
              <div>
                <span className="text-muted-foreground">Phone</span>
                <div className="flex items-center gap-1 font-medium">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />{row.lead_phone_number || '—'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <div className="flex items-center gap-1 break-all font-medium">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />{row.lead_email || '—'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Last Appointment</span>
                <div className="font-medium">
                  {row.appointment_date ? formatClinicTime(row.appointment_date, timezone) : '—'}
                </div>
              </div>
              <div><span className="text-muted-foreground">Contact Attempts</span><div className="font-medium">{row.attempt_count}</div></div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Outcome</span>
                <div className="font-medium">
                  {row.work_status === 'completed'
                    ? `Completed — ${row.completion_reason ? COMPLETION_REASON_LABELS[row.completion_reason] : row.outcome || '—'}`
                    : row.conversation_outcome
                      ? CONVERSATION_OUTCOME_LABELS[row.conversation_outcome]
                      : WORK_STATUS_LABELS[row.work_status]}
                  {row.booked_by_name && ` · booked by ${row.booked_by_name}`}
                </div>
                {row.outcome_notes && <div className="text-muted-foreground">{row.outcome_notes}</div>}
              </div>
              {row.follow_up_at && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Follow-Up</span>
                  <div className={cn('font-medium', countdown?.overdue && 'text-destructive')}>
                    {formatClinicTime(row.follow_up_at, row.follow_up_timezone || timezone)}
                    {countdown && ` · ${countdown.label}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Clinic local time — {timezoneLabel(row.follow_up_timezone || timezone)}
                  </div>
                  {row.follow_up_note && <div className="text-muted-foreground">{row.follow_up_note}</div>}
                </div>
              )}
            </div>

            {row.stale && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                This case is stale — the source appointment is no longer in a cancelled/no-show state.
              </div>
            )}

            <Section
              title="Activity History"
              count={activityCount}
              open={activityOpen}
              onToggle={() => setActivityOpen((o) => !o)}
            >
              {loadingAttempts ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : activityCount === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {attempts.map((a) => (
                    <div key={a.id} className="rounded-md border bg-card p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {CHANNEL_LABELS[a.channel] || a.channel}
                          {a.result ? ` — ${RESULT_LABELS[a.result] || a.result}` : ''}
                          {a.conversation_outcome
                            ? ` · ${CONVERSATION_OUTCOME_LABELS[a.conversation_outcome]}`
                            : ''}
                        </span>
                        <span className="text-muted-foreground">
                          {format(parseISO(a.attempted_at), 'MMM d, yyyy h:mm a')}
                          {a.user_name ? ` · ${a.user_name}` : ''}
                        </span>
                      </div>
                      {a.booked_by_name && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Booked / rescheduled by {a.booked_by_name}
                        </div>
                      )}
                      {a.note && <div className="mt-1">{a.note}</div>}
                    </div>
                  ))}
                  {row.opened_at && (
                    <div className="rounded-md border bg-card p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">Opened Recapture record</span>
                        <span className="text-muted-foreground">
                          {format(parseISO(row.opened_at), 'MMM d, yyyy h:mm a')}
                          {row.opened_by_name ? ` · ${row.opened_by_name}` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>

            <Section
              title="Notes"
              count={notes.length}
              open={notesOpen}
              onToggle={() => setNotesOpen((o) => !o)}
            >
              {row.appointment_id ? (
                <>
                  <div className="mb-2 flex gap-2">
                    <div className="flex-1">
                      <MentionTextarea
                        value={noteText}
                        onChange={setNoteText}
                        placeholder="Add an internal note — type @ to mention a teammate..."
                        rows={2}
                      />
                    </div>
                    <Button size="sm" onClick={addNote} disabled={savingNote || !noteText.trim()}>
                      {savingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add
                    </Button>
                  </div>
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No internal notes yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {notes.map((n) => {
                        const type = classifyNoteAuthor(n.created_by);
                        return (
                          <div key={n.id} className={cn('rounded-md border p-3 text-sm', NOTE_AUTHOR_CLASSES[type])}>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className={NOTE_AUTHOR_BADGE_CLASSES[type]}>
                                {NOTE_AUTHOR_LABELS[type]}
                              </Badge>
                              <span>{n.created_by}</span>
                              <span>·</span>
                              <span>{format(parseISO(n.created_at), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                            <div className="mt-1 whitespace-pre-wrap">
                              {renderNoteWithMentions(n.note_text)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No linked appointment record.</p>
              )}
            </Section>
          </div>
        </SheetContent>
      </Sheet>

      <LogAttemptDialog
        open={attemptOpen}
        onOpenChange={setAttemptOpen}
        saving={saving}
        currentUserId={user?.id}
        currentUserName={actor}
        onSubmit={handleAttemptSubmit}
      />

      <ScheduleFollowUpDialog
        open={followUpOpen}
        onOpenChange={(o) => { setFollowUpOpen(o); if (!o) setPending(null); }}
        timezone={timezone}
        saving={saving}
        initialNote={pending?.note}
        onSchedule={(fu) => { if (pending) void persist(pending, fu); }}
      />
    </>
  );
}
