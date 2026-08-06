import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Check, X, AlertTriangle, RefreshCw, Search, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ChevronsUpDown, Undo2, Trash2, Copy, ArrowRightLeft, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserAttribution } from '@/hooks/useUserAttribution';
import DetailedAppointmentView from '@/components/appointments/DetailedAppointmentView';
import type { AllAppointment } from '@/components/appointments/types';
import { formatDate, formatTime } from '@/components/appointments/utils';
import { changeAppointmentStatus } from '@/utils/appointmentStatusChange';
import { SELECTABLE_DECLINE_REASONS, GENERIC_DECLINE_TAG, getDeclineReason, declineReasonLabel, resolveDeclineReasonValue, rescheduleTagFor } from './declineReasons';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { rewriteDobInNotes, extractDobFromNotes, isImpossibleDobValue } from '@/lib/dobNotes';

// Surface the full Postgres/Supabase error so failures are diagnosable from a screenshot
const describeError = (e: any): string => {
  if (!e) return 'Unknown error';
  const parts = [e.message || String(e)];
  if (e.details) parts.push(`Details: ${e.details}`);
  if (e.hint) parts.push(`Hint: ${e.hint}`);
  if (e.code) parts.push(`Code: ${e.code}`);
  const msg = parts.join(' | ');
  console.error('[ReviewQueue] Action failed:', { message: e.message, code: e.code, details: e.details, hint: e.hint, error: e });
  return msg;
};

interface ReviewAppointment {
  id: string;
  lead_name: string;
  lead_phone_number: string | null;
  lead_email: string | null;
  project_name: string;
  calendar_name: string | null;
  date_of_appointment: string | null;
  requested_time: string | null;
  date_appointment_created: string;
  status: string | null;
  patient_intake_notes: string | null;
  parsed_pathology_info: any;
  parsed_insurance_info: any;
  parsed_demographics: any;
  dob: string | null;
  ghl_id: string | null;
  review_status: string;
  review_stage?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
  decline_reason?: string | null;
}

interface DuplicateAppt {
  id: string;
  date_of_appointment: string | null;
  requested_time: string | null;
  calendar_name: string | null;
  status: string | null;
}

type ActionType = 'approved' | 'declined' | 'oon';
type SortKey = 'patient' | 'project' | 'service' | 'appointment';
type SortDir = 'asc' | 'desc';
type QueueView = 'new' | 'pending' | 'declined';

const ReviewQueue: React.FC = () => {
  const { toast } = useToast();
  const { userName } = useUserAttribution();
  const [rows, setRows] = useState<ReviewAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionRow, setActionRow] = useState<{ id: string; action: ActionType } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [declineReason, setDeclineReason] = useState<string>('');
  const [otherNeedsReschedule, setOtherNeedsReschedule] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detailAppt, setDetailAppt] = useState<AllAppointment | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [queueView, setQueueView] = useState<QueueView>('new');
  const [newCount, setNewCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [declinedCount, setDeclinedCount] = useState(0);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [duplicatesByRowId, setDuplicatesByRowId] = useState<Record<string, DuplicateAppt[]>>({});
  const [dupActionRow, setDupActionRow] = useState<{ row: ReviewAppointment; action: 'replace' | 'keep' } | null>(null);
  const [adoptSlotTarget, setAdoptSlotTarget] = useState<{ row: ReviewAppointment; source: DuplicateAppt } | null>(null);
  const [shortNoticeByRowId, setShortNoticeByRowId] = useState<Record<string, number>>({});
  const [shortNoticeOnly, setShortNoticeOnly] = useState(false);

  const startEdit = (row: ReviewAppointment) => {
    setEditingRowId(row.id);
    setEditName(row.lead_name || '');
    const demoDob = (row.parsed_demographics && row.parsed_demographics.dob) || '';
    setEditDob((row.dob || demoDob || '').slice(0, 10));
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditName('');
    setEditDob('');
  };

  const calcAge = (dob: string): number | null => {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  };

  const handleSaveEdit = async (row: ReviewAppointment) => {
    const newName = editName.trim();
    if (!newName) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const newDob = editDob ? editDob.trim() : null;
    if (newDob && !/^\d{4}-\d{2}-\d{2}$/.test(newDob)) {
      toast({ title: 'Invalid DOB', description: 'Use YYYY-MM-DD', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const mergedContact = { ...(row as any).parsed_contact_info || {}, name: newName };
      const newAge = newDob ? calcAge(newDob) : null;
      const mergedDemo = {
        ...(row.parsed_demographics || {}),
        ...(newDob ? { dob: newDob, age: newAge } : {}),
      };
      const updatePayload: any = {
        lead_name: newName,
        parsed_contact_info: mergedContact,
        parsed_demographics: mergedDemo,
        updated_at: new Date().toISOString(),
      };
      if (newDob) {
        updatePayload.dob = newDob;
        updatePayload.dob_verified_at = new Date().toISOString();
        // Rewrite the raw intake notes DOB line too — that text is what clinics read.
        const rewritten = rewriteDobInNotes(row.patient_intake_notes, newDob);
        if (rewritten) updatePayload.patient_intake_notes = rewritten;
      }

      const { error: updErr } = await supabase
        .from('all_appointments')
        .update(updatePayload)
        .eq('id', row.id);
      if (updErr) throw updErr;

      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment',
          p_action: 'review_edited',
          p_description: `Updated patient details in Review Queue: name "${row.lead_name}" → "${newName}"${newDob ? `, DOB → ${newDob}` : ''} by ${userName || 'Unknown'}`,
          p_source: 'review_queue',
          p_metadata: {
            appointment_id: row.id,
            project_name: row.project_name,
            old_name: row.lead_name,
            new_name: newName,
            old_dob: row.dob,
            new_dob: newDob,
          },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      setRows(prev => prev.map(r => r.id === row.id ? {
        ...r,
        lead_name: newName,
        dob: newDob ?? r.dob,
        parsed_demographics: mergedDemo,
      } : r));
      toast({ title: 'Saved', description: newName });
      cancelEdit();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  /**
   * DOB is invalid when the birth year is the current year or in the future —
   * checked on the structured DOB AND on the DOB written in the raw intake notes,
   * since clinics read that text too.
   */
  const isInvalidDob = (row: ReviewAppointment): boolean => {
    const structured = (row.dob || row.parsed_demographics?.dob || '').toString().trim();
    if (isImpossibleDobValue(structured)) return true;
    return isImpossibleDobValue(extractDobFromNotes(row.patient_intake_notes));
  };


  const sortedRows = useMemo(() => {
    const base = shortNoticeOnly ? rows.filter(r => shortNoticeByRowId[r.id] !== undefined) : rows;
    let ordered = base;
    if (sortKey) {
      const dir = sortDir === 'asc' ? 1 : -1;
      const getVal = (r: ReviewAppointment): string | number => {
        switch (sortKey) {
          case 'patient':
            return (r.lead_name || '').toLowerCase();
          case 'project':
            return (r.project_name || '').toLowerCase();
          case 'service': {
            const proc = (r.parsed_pathology_info?.procedure_type || '').toString().toLowerCase();
            const cal = (r.calendar_name || '').toLowerCase();
            return `${proc}|${cal}`;
          }
          case 'appointment': {
            if (!r.date_of_appointment) return Number.POSITIVE_INFINITY;
            const t = r.requested_time || '00:00:00';
            return new Date(`${r.date_of_appointment}T${t}`).getTime() || Number.POSITIVE_INFINITY;
          }
        }
      };
      ordered = [...base].sort((a, b) => {
        const av = getVal(a);
        const bv = getVal(b);
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      });
    }
    // Always float short-notice rows to the top of the Pending view
    if (queueView === 'pending') {
      ordered = [...ordered].sort((a, b) => {
        const aS = shortNoticeByRowId[a.id] !== undefined ? 0 : 1;
        const bS = shortNoticeByRowId[b.id] !== undefined ? 0 : 1;
        return aS - bS;
      });
    }
    return ordered;
  }, [rows, sortKey, sortDir, shortNoticeByRowId, shortNoticeOnly, queueView]);




  const openDetail = async (id: string) => {
    setDetailLoading(id);
    const { data, error } = await supabase
      .from('all_appointments')
      .select('*')
      .eq('id', id)
      .single();
    setDetailLoading(null);
    if (error || !data) {
      toast({ title: 'Could not load appointment', description: error?.message, variant: 'destructive' });
      return;
    }
    setDetailAppt(data as unknown as AllAppointment);
  };

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('all_appointments')
      .select('id, lead_name, lead_phone_number, lead_email, project_name, calendar_name, date_of_appointment, requested_time, date_appointment_created, status, patient_intake_notes, parsed_pathology_info, parsed_insurance_info, parsed_demographics, dob, ghl_id, review_status, review_stage, created_at, reviewed_at, reviewed_by, review_notes, decline_reason')
      .eq('review_status', queueView === 'declined' ? 'declined' : 'pending')
      .or('is_reserved_block.is.null,is_reserved_block.eq.false')
      .limit(500);

    if (queueView === 'declined') {
      q = q.order('reviewed_at', { ascending: false, nullsFirst: false });
    } else {
      q = q.eq('review_stage', queueView === 'new' ? 'new' : 'pending_review');
      q = q.order('created_at', { ascending: false });
    }

    if (projectFilter !== 'ALL') q = q.eq('project_name', projectFilter);
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`lead_name.ilike.%${s}%,lead_phone_number.ilike.%${s}%,lead_email.ilike.%${s}%`);
    }

    const { data, error } = await q;
    if (error) {
      toast({ title: 'Error loading queue', description: error.message, variant: 'destructive' });
      setRows([]);
    } else {
      const list = (data || []) as ReviewAppointment[];
      setRows(list);

      // Fetch reviewer names for declined view
      if (queueView === 'declined') {
        const reviewerIds = Array.from(new Set(list.map(r => r.reviewed_by).filter(Boolean))) as string[];
        if (reviewerIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', reviewerIds);
          const map: Record<string, string> = {};
          (profs || []).forEach((p: any) => { map[p.id] = p.full_name || p.email || p.id; });
          setReviewerNames(map);
        }
      }
    }
    setLoading(false);
  }, [projectFilter, search, toast, queueView]);

  const fetchCounts = useCallback(async () => {
    const base = (status: string, stage?: string) => {
      let q = supabase
        .from('all_appointments')
        .select('id', { count: 'exact', head: true })
        .eq('review_status', status)
        .or('is_reserved_block.is.null,is_reserved_block.eq.false');
      if (stage) q = q.eq('review_stage', stage);
      return q;
    };
    const [{ count: nc }, { count: pc }, { count: dc }] = await Promise.all([
      base('pending', 'new'),
      base('pending', 'pending_review'),
      base('declined'),
    ]);
    setNewCount(nc || 0);
    setPendingCount(pc || 0);
    setDeclinedCount(dc || 0);
  }, []);

  useEffect(() => {
    fetch();
    fetchCounts();
    const i = setInterval(() => { fetch(); fetchCounts(); }, 30000);
    return () => clearInterval(i);
  }, [fetch, fetchCounts]);

  const projects = Array.from(new Set(rows.map(r => r.project_name))).sort();

  // Detect duplicates: existing future, active appts for same patient+project
  useEffect(() => {
    const run = async () => {
      if (queueView !== 'pending' || rows.length === 0) {
        setDuplicatesByRowId({});
        return;
      }
      const TERMINAL = ['Cancelled', 'No Show', 'OON', 'Do Not Call', 'Rescheduled', 'Showed', 'Won'];
      const today = new Date().toISOString().slice(0, 10);
      const ids = rows.map(r => r.id);
      const phones = Array.from(new Set(rows.map(r => r.lead_phone_number).filter(Boolean))) as string[];
      const emails = Array.from(new Set(rows.map(r => r.lead_email).filter(Boolean))) as string[];
      const projectNames = Array.from(new Set(rows.map(r => r.project_name).filter(Boolean))) as string[];
      if (phones.length === 0 && emails.length === 0) {
        setDuplicatesByRowId({});
        return;
      }
      const ors: string[] = [];
      if (phones.length) ors.push(`lead_phone_number.in.(${phones.map(p => `"${p}"`).join(',')})`);
      if (emails.length) ors.push(`lead_email.in.(${emails.map(e => `"${e}"`).join(',')})`);
      const { data, error } = await supabase
        .from('all_appointments')
        .select('id, lead_phone_number, lead_email, project_name, date_of_appointment, requested_time, calendar_name, status, review_status')
        .in('project_name', projectNames)
        .gte('date_of_appointment', today)
        .not('status', 'in', `(${TERMINAL.map(s => `"${s}"`).join(',')})`)
        .or('is_superseded.is.null,is_superseded.eq.false')
        .or(ors.join(','))
        .limit(500);
      if (error) {
        console.warn('duplicate fetch failed', error);
        return;
      }
      const map: Record<string, DuplicateAppt[]> = {};
      for (const r of rows) {
        const matches = (data || []).filter((a: any) =>
          a.id !== r.id &&
          a.project_name === r.project_name &&
          a.review_status !== 'pending' &&
          a.review_status !== 'declined' &&
          a.review_status !== 'dismissed' &&
          ((r.lead_phone_number && a.lead_phone_number === r.lead_phone_number) ||
           (r.lead_email && a.lead_email === r.lead_email))
        );
        if (matches.length) map[r.id] = matches.map((m: any) => ({
          id: m.id,
          date_of_appointment: m.date_of_appointment,
          requested_time: m.requested_time,
          calendar_name: m.calendar_name,
          status: m.status,
        }));
      }
      setDuplicatesByRowId(map);
    };
    run();
  }, [rows, queueView]);

  // Detect short-notice alerts for pending rows
  useEffect(() => {
    const run = async () => {
      if (queueView !== 'pending' || rows.length === 0) {
        setShortNoticeByRowId({});
        return;
      }
      const ids = rows.map(r => r.id);
      const { data, error } = await supabase
        .from('short_notice_alerts')
        .select('appointment_id, hours_difference')
        .in('appointment_id', ids)
        .is('resolved_at', null);
      if (error) {
        console.warn('short-notice fetch failed', error);
        return;
      }
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        if (r.appointment_id != null && (map[r.appointment_id] === undefined || r.hours_difference < map[r.appointment_id])) {
          map[r.appointment_id] = Number(r.hours_difference);
        }
      });
      setShortNoticeByRowId(map);
    };
    run();
  }, [rows, queueView]);

  const handleReplaceExisting = async (row: ReviewAppointment) => {
    const dups = duplicatesByRowId[row.id] || [];
    setProcessing(true);
    try {
      // Approve the new row; the DB trigger will supersede older active siblings.
      const ok = await performAction(row.id, 'approved', 'Approved via Replace existing; older active rows superseded.');
      if (!ok) { setProcessing(false); return; }

      const newWhen = `${row.date_of_appointment || 'unscheduled'} ${row.requested_time || ''}`.trim();
      const supersededIds = dups.map(d => d.id);

      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment',
          p_action: 'replace_existing_duplicate',
          p_description: `Replaced existing duplicate(s) via Review Queue: ${row.lead_name} (${row.project_name}); ${supersededIds.length} prior appt(s) superseded by ${userName || 'Unknown'}`,
          p_source: 'review_queue',
          p_metadata: { surviving_appointment_id: row.id, superseded_appointment_ids: supersededIds, new_when: newWhen },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      toast({ title: 'Approved and superseded', description: `Approved new; ${supersededIds.length} existing appt(s) moved to history.` });
      setRows(prev => prev.filter(r => r.id !== row.id));
      setDupActionRow(null);
      fetchCounts();
    } catch (e: any) {
      toast({ title: 'Replace failed', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleKeepExisting = async (row: ReviewAppointment) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updErr } = await supabase
        .from('all_appointments')
        .update({
          review_status: 'dismissed',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
          review_notes: 'Duplicate of existing appointment kept',
        })
        .eq('id', row.id);
      if (updErr) throw updErr;

      await supabase.from('appointment_review_history').insert({
        appointment_id: row.id,
        action: 'dismissed',
        prior_status: 'pending',
        actor_id: user?.id ?? null,
        actor_name: userName || user?.email || 'Unknown',
        notes: 'Duplicate of existing appointment kept',
      });

      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment',
          p_action: 'review_dismissed',
          p_description: `Dismissed duplicate from Review Queue (kept existing): ${row.lead_name} by ${userName || 'Unknown'}`,
          p_source: 'review_queue',
          p_metadata: { appointment_id: row.id, project_name: row.project_name },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      toast({ title: 'Kept existing, dismissed new', description: row.lead_name });
      setRows(prev => prev.filter(r => r.id !== row.id));
      setDupActionRow(null);
      fetchCounts();
    } catch (e: any) {
      toast({ title: 'Action failed', description: describeError(e), variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAdoptSlot = async (row: ReviewAppointment, source: DuplicateAppt) => {
    if (row.id === source.id) return;
    setProcessing(true);
    try {
      const prevDate = row.date_of_appointment;
      const prevTime = row.requested_time;
      const newDate = source.date_of_appointment;
      const newTime = source.requested_time;

      const { error: updErr } = await supabase
        .from('all_appointments')
        .update({
          date_of_appointment: newDate,
          requested_time: newTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (updErr) throw updErr;

      const fromStr = `${prevDate || 'unscheduled'} ${prevTime || ''}`.trim();
      const toStr = `${newDate || 'unscheduled'} ${newTime || ''}`.trim();
      const utcTimestamp = new Date().toISOString();
      try {
        await supabase.from('appointment_notes').insert({
          appointment_id: row.id,
          note_text: `Adopted slot FROM: ${fromStr} TO: ${toStr} from duplicate record (deleted) by ${userName || 'Unknown'} - [[timestamp:${utcTimestamp}]]`,
          created_by: userName || 'Review Queue',
        });
      } catch (e) {
        console.warn('adopt-slot note insert failed', e);
      }

      const { error: delErr } = await supabase
        .from('all_appointments')
        .delete()
        .eq('id', source.id);
      if (delErr) throw delErr;

      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment',
          p_action: 'adopt_slot_from_duplicate',
          p_description: `${userName || 'Unknown'} adopted slot ${toStr} for ${row.lead_name} from duplicate (deleted)`,
          p_source: 'review_queue',
          p_metadata: {
            adopting_appointment_id: row.id,
            deleted_appointment_id: source.id,
            previous_date: prevDate,
            previous_time: prevTime,
            new_date: newDate,
            new_time: newTime,
            project_name: row.project_name,
            lead_name: row.lead_name,
          },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      toast({ title: 'Slot adopted', description: `${row.lead_name} now set to ${toStr}. Duplicate record deleted.` });
      setAdoptSlotTarget(null);
      setDuplicatesByRowId(prev => {
        const copy = { ...prev };
        Object.keys(copy).forEach(k => { copy[k] = (copy[k] || []).filter(d => d.id !== source.id); });
        if (copy[row.id]) {
          copy[row.id] = copy[row.id].filter(d => d.id !== source.id);
        }
        return copy;
      });
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, date_of_appointment: newDate, requested_time: newTime } : r));
      fetchCounts();
    } catch (e: any) {
      toast({ title: 'Adopt slot failed', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };




  const performAction = async (id: string, action: ActionType, notes?: string, reasonValue?: string) => {
    setProcessing(true);
    try {
      const { data: priorRow } = await supabase
        .from('all_appointments')
        .select('review_status, lead_name, lead_phone_number, calendar_name, project_name, status, ghl_id, ghl_appointment_id, decline_notified_at')
        .eq('id', id)
        .single();

      const reasonOption = action === 'declined' ? getDeclineReason(reasonValue) : undefined;
      const explanation = (notes || '').trim();
      const combinedNotes =
        action === 'declined'
          ? [reasonOption?.label, explanation].filter(Boolean).join(' — ') || null
          : notes || null;

      const update: any = {
        review_status: action,
        reviewed_at: new Date().toISOString(),
        review_notes: combinedNotes,
      };
      const { data: { user } } = await supabase.auth.getUser();
      if (user) update.reviewed_by = user.id;

      if (action === 'oon') {
        update.status = 'OON';
        update.internal_process_complete = true;
        update.procedure_ordered = false;
      }

      if (action === 'declined') {
        update.decline_reason = reasonValue || null;
      }

      const { error: updErr } = await supabase
        .from('all_appointments')
        .update(update)
        .eq('id', id);
      if (updErr) throw updErr;

      await supabase.from('appointment_review_history').insert({
        appointment_id: id,
        action,
        prior_status: priorRow?.review_status ?? null,
        actor_id: user?.id ?? null,
        actor_name: userName || user?.email || 'Unknown',
        notes: combinedNotes,
      });

      // Audit log
      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment',
          p_action: `review_${action}`,
          p_description: `${action === 'oon' ? 'Marked as OON' : action === 'approved' ? 'Approved' : 'Declined'}: ${priorRow?.lead_name ?? id} by ${userName || 'Unknown'}`,
          p_source: 'review_queue',
          p_metadata: {
            appointment_id: id,
            project_name: priorRow?.project_name,
            notes: combinedNotes,
            decline_reason: action === 'declined' ? reasonValue || null : undefined,
          },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }


      // Approved side effect: add 'approved' tag to GHL contact
      if (action === 'approved') {
        if (!priorRow?.ghl_id) {
          console.warn('Approve: no ghl_id on appointment; skipping GHL tag');
          toast({
            title: 'Approved — GHL tag skipped',
            description: 'This appointment has no linked GHL contact, so the "approved" tag was not added.',
          });
        } else {
          try {
            const { data: projectData } = await supabase
              .from('projects')
              .select('ghl_api_key')
              .eq('project_name', priorRow.project_name)
              .maybeSingle();

            const { data: tagData, error: tagErr } = await supabase.functions.invoke('update-ghl-contact-tags', {
              body: {
                ghl_contact_id: priorRow.ghl_id,
                ghl_api_key: projectData?.ghl_api_key || undefined,
                tags: ['approved'],
                action: 'add',
                source: `Review Queue manual approve by ${userName || 'a portal user'}`,

              },
            });
            console.log('update-ghl-contact-tags response:', { tagData, tagErr });
            if (tagErr) {
              console.error('update-ghl-contact-tags failed:', tagErr);
              toast({
                title: 'Approved — GHL tag will retry',
                description: 'Approval saved. The hourly retry job will add the "approved" tag in GHL.',
              });
            } else {
              // Verify the tag actually landed in GHL before stamping success.
              // Prevents "we lied about success" rows that the sweep can't see.
              let verified = false;
              try {
                const verifyRes = await window.fetch(
                  `https://services.leadconnectorhq.com/contacts/${priorRow.ghl_id}`,
                  {
                    headers: {
                      Authorization: `Bearer ${projectData?.ghl_api_key ?? ''}`,
                      Version: '2021-07-28',
                      Accept: 'application/json',
                    },
                  },
                );
                if (verifyRes.ok) {
                  const verifyJson = await verifyRes.json().catch(() => ({} as any));
                  const tags: unknown[] = Array.isArray(verifyJson?.contact?.tags)
                    ? verifyJson.contact.tags
                    : Array.isArray(verifyJson?.tags)
                      ? verifyJson.tags
                      : [];
                  verified = tags.some((t) => String(t).toLowerCase().trim() === 'approved');
                } else {
                  console.warn('GHL verify GET non-OK:', verifyRes.status);
                }
              } catch (verifyErr) {
                console.warn('GHL verify GET threw:', verifyErr);
              }

              if (verified) {
                await supabase
                  .from('all_appointments')
                  .update({ ghl_approved_tag_sent_at: new Date().toISOString() })
                  .eq('id', id);
              } else {
                console.warn(`Approve: tag push returned OK but verify failed for ${id}; leaving stamp NULL for cron retry`);
                toast({
                  title: 'Approved — GHL tag will retry',
                  description: 'Approval saved. The hourly retry job will confirm the "approved" tag in GHL.',
                });
              }
            }
          } catch (err) {
            console.error('update-ghl-contact-tags threw:', err);
            toast({
              title: 'Approved, but GHL tag not added',
              description: (err as Error)?.message || 'Unknown error invoking GHL tag function.',
              variant: 'destructive',
            });
          }
        }
      }

      // OON side effects
      if (action === 'oon' && priorRow) {
        const oldStatus = priorRow.status || 'Pending';
        const utcTimestamp = new Date().toISOString();

        try {
          await supabase.from('appointment_notes').insert({
            appointment_id: id,
            note_text: `Status changed from "${oldStatus}" to "OON" by ${userName || 'Review Queue'} - [[timestamp:${utcTimestamp}]]`,
            created_by: userName || 'Review Queue',
          });
        } catch (e) {
          console.warn('System note insert failed', e);
        }

        try {
          const { data: whData, error: whErr } = await supabase.functions.invoke('appointment-status-webhook', {
            body: {
              appointment_id: id,
              old_status: oldStatus,
              new_status: 'OON',
            },
          });
          if (whErr || (whData && whData.success === false)) {
            console.error('appointment-status-webhook failed:', whErr || whData);
            toast({
              title: 'OON saved, but GHL workflow did not fire',
              description: 'Status was updated, but the outbound webhook to GHL failed. Contact engineering.',
              variant: 'destructive',
            });
          }
        } catch (err) {
          console.error('appointment-status-webhook threw:', err);
          toast({
            title: 'OON saved, but GHL workflow did not fire',
            description: 'The outbound webhook to GHL threw an error. Contact engineering.',
            variant: 'destructive',
          });
        }

        try {
          const nameParts = (priorRow.lead_name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          const { error: slackErr } = await supabase.functions.invoke('notify-slack-oon', {
            body: {
              firstName,
              lastName,
              phone: priorRow.lead_phone_number || '',
              calendarName: priorRow.calendar_name || '',
              projectName: priorRow.project_name,
              appointmentId: id,
            },
          });
          if (slackErr) {
            console.error('notify-slack-oon failed:', slackErr);
            toast({
              title: 'Slack OON alert failed',
              description: 'OON status was saved, but the Slack alert did not deliver. The webhook URL may be stale.',
              variant: 'destructive',
            });
          }
        } catch (err) {
          console.error('notify-slack-oon threw:', err);
          toast({
            title: 'Slack OON alert failed',
            description: 'OON status was saved, but the Slack alert threw an error.',
            variant: 'destructive',
          });
        }

        // GHL exit tag: without this, contacts sit forever in the GHL workflow
        // Wait step that only listens for the 'approved' tag.
        if (priorRow.ghl_id) {
          try {
            const { data: projectData } = await supabase
              .from('projects')
              .select('ghl_api_key')
              .eq('project_name', priorRow.project_name)
              .maybeSingle();

            const { error: oonTagErr } = await supabase.functions.invoke('update-ghl-contact-tags', {
              body: {
                ghl_contact_id: priorRow.ghl_id,
                ghl_api_key: projectData?.ghl_api_key || undefined,
                tags: ['appointment-oon'],
                action: 'add',
              },
            });
            if (oonTagErr) {
              console.error('OON GHL tag failed:', oonTagErr);
              toast({
                title: 'OON saved — GHL tag failed',
                description: 'The "appointment-oon" tag could not be added in GHL.',
                variant: 'destructive',
              });
            }
          } catch (err) {
            console.error('OON GHL tag threw:', err);
          }
        }
      }


      // Decline side effects: auto-cancel through the SINGLE canonical status
      // path, log the reason, and notify the patient via GHL tags — exactly once.
      if (action === 'declined' && priorRow) {
        const reasonLabel = reasonOption?.label ?? 'Declined';
        const stamp = new Date().toISOString();
        const actor = userName || user?.email || 'Review Queue';

        // 1. Cancel (skipped when the row is already Cancelled — no duplicate push)
        if ((priorRow.status || '').toLowerCase() !== 'cancelled') {
          try {
            await changeAppointmentStatus({
              appointmentId: id,
              newStatus: 'Cancelled',
              userName: actor,
              currentAppointment: priorRow as any,
              onWarning: ({ title, description, severe }) =>
                toast({ title, description, variant: severe ? 'destructive' : undefined }),
            });
          } catch (err) {
            console.error('Decline auto-cancel failed:', err);
            toast({
              title: 'Declined, but cancel failed',
              description: 'The decline was saved but the appointment could not be cancelled. Cancel it manually.',
              variant: 'destructive',
            });
          }
        }

        // 2. Portal note with attribution
        const rescheduleWord = reasonOption?.reschedulable ? 'yes' : 'no';
        const declineNote = `Declined: ${reasonLabel}${explanation ? ` — ${explanation}` : ''} (Reschedule: ${rescheduleWord}) by ${actor} - [[timestamp:${stamp}]]`;
        try {
          await supabase.from('appointment_notes').insert({
            appointment_id: id,
            note_text: declineNote,
            created_by: actor,
          });
        } catch (e) {
          console.warn('Decline note insert failed', e);
        }

        // 3 + 4. GHL contact note + reason tag — guarded against duplicates
        if (!priorRow.decline_notified_at && priorRow.ghl_id) {
          let notified = false;
          const { data: projectData } = await supabase
            .from('projects')
            .select('ghl_api_key')
            .eq('project_name', priorRow.project_name)
            .maybeSingle();

          const localStamp = new Date().toLocaleString('en-US');
          const ghlNote = `Appointment declined in PatientPro Portal\nReason: ${reasonLabel}${explanation ? `\nDetails: ${explanation}` : ''}\nReschedule: ${reasonOption?.reschedulable ? 'Patient needs to be rescheduled' : 'Patient should not be rescheduled'}\nBy: ${actor}\nDate/Time: ${localStamp}`;

          try {
            const { error: noteErr } = await supabase.functions.invoke('add-ghl-contact-note', {
              body: {
                ghl_contact_id: priorRow.ghl_id,
                project_name: priorRow.project_name,
                ghl_api_key: projectData?.ghl_api_key || undefined,
                note: ghlNote,
              },
            });
            if (noteErr) throw noteErr;
            notified = true;
          } catch (err) {
            console.error('add-ghl-contact-note failed:', err);
            toast({
              title: 'Declined — GHL note failed',
              description: 'The decline was saved, but the reason could not be written to the GHL contact.',
              variant: 'destructive',
            });
          }

          try {
            const { error: tagErr } = await supabase.functions.invoke('update-ghl-contact-tags', {
              body: {
                ghl_contact_id: priorRow.ghl_id,
                ghl_api_key: projectData?.ghl_api_key || undefined,
                tags: [GENERIC_DECLINE_TAG, reasonOption?.tag, rescheduleTagFor(reasonValue)].filter(Boolean),
                action: 'add',
              },
            });
            if (tagErr) throw tagErr;
            notified = true;
          } catch (err) {
            console.error('decline tag push failed:', err);
            toast({
              title: 'Declined — patient message not triggered',
              description: 'The decline was saved, but the GHL tag failed so the text/email may not send.',
              variant: 'destructive',
            });
          }

          if (notified) {
            await supabase
              .from('all_appointments')
              .update({ decline_notified_at: new Date().toISOString() })
              .eq('id', id);
          }
        } else if (!priorRow.ghl_id) {
          toast({
            title: 'Declined — no GHL contact linked',
            description: 'No text/email was triggered because this appointment has no GHL contact.',
          });
        }
      }
    } catch (e: any) {
      toast({ title: 'Action failed', description: describeError(e), variant: 'destructive' });
      setProcessing(false);
      return false;
    }
    setProcessing(false);
    return true;
  };

  const handleSingleAction = async (id: string, action: ActionType, notes?: string, reasonValue?: string, duplicateCount?: number) => {
    const ok = await performAction(id, action, notes, reasonValue);
    if (ok) {
      if (action === 'approved' && duplicateCount && duplicateCount > 0) {
        toast({ title: 'Approved and superseded', description: `${duplicateCount} existing appointment(s) moved to history.` });
      } else {
        toast({ title: `Appointment ${action === 'oon' ? 'marked as OON' : action === 'declined' ? 'declined and cancelled' : action}` });
      }
      setRows(prev => prev.filter(r => r.id !== id));
      setActionRow(null);
      setActionNotes('');
      setDeclineReason(''); setOtherNeedsReschedule(null);
      fetchCounts();
    }
  };


  const handleMoveStage = async (ids: string[], stage: 'new' | 'pending_review') => {
    if (ids.length === 0) return;
    setProcessing(true);
    try {
      const { error: updErr } = await supabase
        .from('all_appointments')
        .update({ review_stage: stage })
        .in('id', ids);
      if (updErr) throw updErr;

      const label = stage === 'pending_review' ? 'Pending Review' : 'New';
      const actor = userName || 'Unknown';
      const stamp = new Date().toISOString();
      try {
        await supabase.from('appointment_notes').insert(
          ids.map(id => ({
            appointment_id: id,
            note_text: `Review Queue: moved to ${label} by ${actor} - [[timestamp:${stamp}]]`,
            created_by: actor === 'Unknown' ? 'Review Queue' : actor,
          }))
        );
      } catch (e) {
        console.warn('stage move note insert failed', e);
      }

      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment',
          p_action: 'review_stage_changed',
          p_description: `Moved ${ids.length} appointment(s) to ${label} in Review Queue by ${actor}`,
          p_source: 'review_queue',
          p_metadata: { appointment_ids: ids, review_stage: stage },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      toast({ title: `Moved to ${label}`, description: `${ids.length} appointment(s)` });
      setRows(prev => prev.filter(r => !ids.includes(r.id)));
      setSelected(new Set());
      fetchCounts();
    } catch (e: any) {
      toast({ title: 'Move failed', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async (row: ReviewAppointment) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updErr } = await supabase
        .from('all_appointments')
        .update({
          review_status: 'pending',
          review_stage: 'new',
          reviewed_at: null,
          reviewed_by: null,
          review_notes: null,
          decline_reason: null,
          decline_notified_at: null,
        })
        .eq('id', row.id);
      if (updErr) throw updErr;

      await supabase.from('appointment_review_history').insert({
        appointment_id: row.id,
        action: 'restored',
        prior_status: 'declined',
        actor_id: user?.id ?? null,
        actor_name: userName || user?.email || 'Unknown',
        notes: null,
      });

      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment',
          p_action: 'review_restored',
          p_description: `Restored to Review Queue: ${row.lead_name} by ${userName || 'Unknown'}`,
          p_source: 'review_queue',
          p_metadata: { appointment_id: row.id, project_name: row.project_name },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      toast({ title: 'Restored to Review Queue', description: row.lead_name });
      setRows(prev => prev.filter(r => r.id !== row.id));
      fetchCounts();
    } catch (e: any) {
      toast({ title: 'Restore failed', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDismiss = async (row: ReviewAppointment) => {
    if (!confirm(`Dismiss "${row.lead_name}" permanently? This removes it from both Pending and Declined views. (You can still find it by patient search elsewhere.)`)) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updErr } = await supabase
        .from('all_appointments')
        .update({ review_status: 'dismissed' })
        .eq('id', row.id);
      if (updErr) throw updErr;

      await supabase.from('appointment_review_history').insert({
        appointment_id: row.id,
        action: 'dismissed',
        prior_status: 'declined',
        actor_id: user?.id ?? null,
        actor_name: userName || user?.email || 'Unknown',
        notes: null,
      });

      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment',
          p_action: 'review_dismissed',
          p_description: `Dismissed from Review Queue: ${row.lead_name} by ${userName || 'Unknown'}`,
          p_source: 'review_queue',
          p_metadata: { appointment_id: row.id, project_name: row.project_name },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      toast({ title: 'Dismissed', description: row.lead_name });
      setRows(prev => prev.filter(r => r.id !== row.id));
      fetchCounts();
    } catch (e: any) {
      toast({ title: 'Dismiss failed', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulk = async (action: ActionType, notes?: string, reasonValue?: string) => {
    if (selected.size === 0) return;
    // Set already de-dupes; processed sequentially so the notify guard is authoritative.
    const ids = Array.from(selected);
    let ok = 0;
    for (const id of ids) {
      const success = await performAction(id, action, notes, reasonValue);
      if (success) ok++;
    }
    toast({ title: `${ok} of ${ids.length} ${action === 'oon' ? 'marked OON' : action}` });
    setRows(prev => prev.filter(r => !selected.has(r.id)));
    setSelected(new Set());
    setActionRow(null);
    setActionNotes('');
    setDeclineReason(''); setOtherNeedsReschedule(null);
    fetchCounts();
  };


  const toggleExpand = (id: string) =>
    setExpanded(e => ({ ...e, [id]: !e[id] }));

  const toggleSelect = (id: string) => {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  };

  const isDeclinedView = queueView === 'declined';
  const isNewView = queueView === 'new';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              Review Queue
            </CardTitle>
            <CardDescription>
              New appointments land in the <strong>New</strong> bucket. Move one to <strong>Pending Review</strong> when it needs more investigation or follow-up, so the next shift knows what is already being worked. Client portals only see appointments that have been Approved (or marked OON). Mistakenly declined appointments can be restored from the Declined tab.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetch(); fetchCounts(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button
            variant={queueView === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setQueueView('new'); setSelected(new Set()); }}
          >
            New
            <Badge variant="secondary" className="ml-2">{newCount}</Badge>
          </Button>
          <Button
            variant={queueView === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setQueueView('pending'); setSelected(new Set()); }}
          >
            Pending Review
            <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
          </Button>
          <Button
            variant={queueView === 'declined' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setQueueView('declined'); setSelected(new Set()); }}
          >
            Declined
            <Badge variant="secondary" className="ml-2">{declinedCount}</Badge>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All projects</SelectItem>
              {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {!isDeclinedView && (
            <Button
              variant={shortNoticeOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShortNoticeOnly(v => !v)}
              className={shortNoticeOnly ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'border-orange-400 text-orange-700 hover:bg-orange-50'}
            >
              <Zap className="h-4 w-4 mr-1" />
              Short notice only
              <Badge variant="secondary" className="ml-2">{Object.keys(shortNoticeByRowId).length}</Badge>
            </Button>
          )}
          {!isDeclinedView && (
            <Badge
              variant="outline"
              className="h-9 px-3 border-destructive/40 text-destructive bg-destructive/5 gap-1"
              title="Appointments whose date of birth uses the current year (or a future year)"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Invalid DOB
              <Badge variant="secondary" className="ml-1">{rows.filter(isInvalidDob).length}</Badge>
            </Badge>
          )}

        </div>


        {/* Bulk actions (pending only) */}
        {!isDeclinedView && selected.size > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
            <span className="text-sm font-medium mr-2">{selected.size} selected</span>
            <Button size="sm" variant="default" onClick={() => handleBulk('approved')} disabled={processing}>
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => { setActionRow({ id: '__BULK__', action: 'declined' }); setActionNotes(''); setDeclineReason(''); setOtherNeedsReschedule(null); }} disabled={processing}>
              <X className="h-4 w-4 mr-1" /> Decline
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMoveStage(Array.from(selected), isNewView ? 'pending_review' : 'new')}
              disabled={processing}
            >
              <ArrowRightLeft className="h-4 w-4 mr-1" />
              {isNewView ? 'Move to Pending Review' : 'Move back to New'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {isDeclinedView ? 'No declined appointments.' : isNewView ? '🎉 No new appointments waiting for review.' : 'No appointments in Pending Review.'}
          </div>
        ) : (
          <div className="border rounded-md divide-y">
            <div className="grid grid-cols-[28px_minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(220px,1.6fr)_minmax(120px,0.9fr)_minmax(300px,auto)] gap-3 p-3 text-xs font-medium text-muted-foreground bg-muted/40 items-center">
              {isDeclinedView ? (
                <div />
              ) : (
                <input
                  type="checkbox"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={selectAll}
                  className="cursor-pointer"
                />
              )}
              <button onClick={() => toggleSort('patient')} className="flex items-center gap-1 text-left hover:text-foreground transition-colors">
                Patient <SortIcon k="patient" />
              </button>
              <button onClick={() => toggleSort('project')} className="flex items-center gap-1 text-left hover:text-foreground transition-colors">
                Project <SortIcon k="project" />
              </button>
              <button onClick={() => toggleSort('service')} className="flex items-center gap-1 text-left hover:text-foreground transition-colors">
                Service / Calendar <SortIcon k="service" />
              </button>
              <button onClick={() => toggleSort('appointment')} className="flex items-center gap-1 text-left hover:text-foreground transition-colors">
                Appointment <SortIcon k="appointment" />
              </button>
              <div className="text-right">Actions</div>
            </div>
            {sortedRows.map(row => {
              const isOpen = expanded[row.id];
              const path = row.parsed_pathology_info || {};
              const ins = row.parsed_insurance_info || {};
              const demo = row.parsed_demographics || {};
              const reviewerLabel = row.reviewed_by ? (reviewerNames[row.reviewed_by] || 'Unknown') : 'Unknown';
              return (
                <div key={row.id} className="hover:bg-muted/20">
                  <div className="grid grid-cols-[28px_minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(220px,1.6fr)_minmax(120px,0.9fr)_minmax(300px,auto)] gap-3 p-3 items-center text-sm">
                    {isDeclinedView ? (
                      <div />
                    ) : (
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="cursor-pointer"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start gap-x-2 gap-y-0 min-w-0">
                        <div className="flex items-start gap-1 min-w-0">
                          <button
                            onClick={() => toggleExpand(row.id)}
                            className="text-muted-foreground hover:text-foreground mt-1 shrink-0"
                            aria-label="Toggle inline details"
                          >
                            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={() => openDetail(row.id)}
                            className="font-sans not-italic font-medium hover:underline text-left text-primary break-words min-w-0"
                            disabled={detailLoading === row.id}
                          >
                            {row.lead_name}{detailLoading === row.id ? '…' : ''}
                          </button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{row.lead_phone_number || '—'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {!isDeclinedView && duplicatesByRowId[row.id]?.length > 0 && (
                          <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 text-[10px] h-auto min-h-5 px-2 py-0.5 whitespace-normal leading-tight inline-flex items-center gap-1">
                            <Copy className="h-2.5 w-2.5 shrink-0" />
                            <span>Duplicate ({duplicatesByRowId[row.id].length})</span>
                          </Badge>
                        )}
                        {!isDeclinedView && shortNoticeByRowId[row.id] !== undefined && (
                          <Badge
                            variant="outline"
                            className="border-orange-400 text-orange-700 bg-orange-50 text-[10px] h-auto min-h-5 px-2 py-0.5 whitespace-normal leading-tight inline-flex items-center gap-1"
                            title="Booked shortly before appointment (business hours)"
                          >
                            <Zap className="h-2.5 w-2.5 shrink-0" />
                            <span>
                              Short Notice · {shortNoticeByRowId[row.id] < 1
                                ? `${Math.max(1, Math.round(shortNoticeByRowId[row.id] * 60))}m`
                                : `${Math.round(shortNoticeByRowId[row.id])}h`}
                            </span>
                          </Badge>
                        )}
                        {!isDeclinedView && isInvalidDob(row) && (
                          <Badge
                            variant="outline"
                            className="border-destructive/50 text-destructive bg-destructive/5 text-[10px] h-auto min-h-5 px-2 py-0.5 whitespace-normal leading-tight inline-flex items-center gap-1"
                            title="Date of birth uses the current year — please correct before approving."
                          >
                            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                            <span>Invalid DOB</span>
                          </Badge>
                        )}
                      </div>

                      {isDeclinedView && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Declined {row.reviewed_at ? formatDate(row.reviewed_at) : '—'} by {reviewerLabel}
                        </div>
                      )}
                    </div>
                    <div className="text-xs min-w-0 break-words">{row.project_name}</div>
                    <div className="text-xs">
                      <div>{path.procedure_type || '—'}</div>
                      <div className="text-muted-foreground truncate">{row.calendar_name || '—'}</div>
                    </div>
                    <div className="text-xs">
                      <div>{formatDate(row.date_of_appointment)}</div>
                      <div className="text-muted-foreground">{formatTime(row.requested_time)}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {isDeclinedView ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary/40 text-primary hover:bg-primary/10"
                            onClick={() => handleRestore(row)}
                            disabled={processing}
                          >
                            <Undo2 className="h-3.5 w-3.5 mr-1" /> Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDismiss(row)}
                            disabled={processing}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Dismiss
                          </Button>
                        </>
                      ) : (
                        <>
                          {duplicatesByRowId[row.id]?.length > 0 && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-amber-600 hover:bg-amber-700"
                                onClick={() => setDupActionRow({ row, action: 'replace' })}
                                disabled={processing}
                                title="Approve new appt and replace the existing duplicate(s)"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Replace
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-muted-foreground/40"
                                onClick={() => setDupActionRow({ row, action: 'keep' })}
                                disabled={processing}
                                title="Keep existing appt, dismiss this duplicate"
                              >
                                <Copy className="h-3.5 w-3.5 mr-1" /> Keep Existing
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleSingleAction(row.id, 'approved', undefined, undefined, duplicatesByRowId[row.id]?.length || 0)}
                            disabled={processing}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-300 text-orange-700 hover:bg-orange-50"
                            onClick={() => { setActionRow({ id: row.id, action: 'oon' }); setActionNotes(''); }}
                            disabled={processing}
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> OON
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setActionRow({ id: row.id, action: 'declined' }); setActionNotes(''); setDeclineReason(''); setOtherNeedsReschedule(null); }}
                            disabled={processing}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Decline
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => handleMoveStage([row.id], isNewView ? 'pending_review' : 'new')}
                            disabled={processing}
                            title={isNewView ? 'Needs more info or follow-up — move to Pending Review' : 'Move back to the New bucket'}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                            {isNewView ? 'Pending Review' : 'Back to New'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-4 pt-1 bg-muted/10 text-xs space-y-3">
                      {!isDeclinedView && duplicatesByRowId[row.id]?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-2">
                          <div className="font-medium text-amber-800 mb-1 flex items-center gap-1">
                            <Copy className="h-3 w-3" />
                            Existing active appointment(s) for this patient in {row.project_name}
                          </div>
                          <div className="space-y-1">
                            {duplicatesByRowId[row.id].map(d => (
                              <div key={d.id} className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className="text-[10px]">{d.status || '—'}</Badge>
                                <span>{formatDate(d.date_of_appointment)} {formatTime(d.requested_time)}</span>
                                <span className="text-muted-foreground truncate">· {d.calendar_name || '—'}</span>
                                <div className="ml-auto flex items-center gap-2">
                                  {!isDeclinedView && (
                                    <button
                                      className="text-amber-700 hover:underline font-medium"
                                      onClick={() => setAdoptSlotTarget({ row, source: d })}
                                      disabled={processing}
                                      title="Copy this date/time onto the active record and delete this duplicate"
                                    >
                                      Use this slot
                                    </button>
                                  )}
                                  <button
                                    className="text-primary hover:underline"
                                    onClick={() => openDetail(d.id)}
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {editingRowId === row.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-background p-3 rounded border">
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Patient Name</div>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Full name"
                              className="h-8"
                            />
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">DOB</div>
                            <Input
                              type="date"
                              value={editDob}
                              onChange={(e) => setEditDob(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="md:col-span-2 flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={cancelEdit} disabled={savingEdit}>Cancel</Button>
                            <Button size="sm" onClick={() => handleSaveEdit(row)} disabled={savingEdit}>
                              {savingEdit ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" className="h-7" onClick={() => startEdit(row)}>
                            Edit Name / DOB
                          </Button>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="font-medium text-muted-foreground">Email</div>
                          <div className="break-all">{row.lead_email || '—'}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-muted-foreground">DOB</div>
                          <div className={`break-words ${isInvalidDob(row) ? 'text-destructive font-medium' : ''}`}>
                            {row.dob || demo.dob || '—'}
                            {isInvalidDob(row) && <span className="ml-1 text-[10px]">(Invalid — check birth year)</span>}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="font-medium text-muted-foreground">Location</div>
                          <div className="break-words">{path.location || '—'}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-muted-foreground">Insurance</div>
                          <div className="break-words">{ins.provider || ins.plan || '—'}</div>
                        </div>
                      </div>
                      {isDeclinedView && (row.decline_reason || row.review_notes) && (
                        <div>
                          <div className="font-medium text-muted-foreground mb-1">Decline reason</div>
                          <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-background p-2 rounded border max-w-full overflow-hidden">
                            {row.decline_reason ? declineReasonLabel(row.decline_reason) : null}
                            {row.decline_reason && row.review_notes ? <div className="text-muted-foreground mt-1">{row.review_notes}</div> : null}
                            {!row.decline_reason ? row.review_notes : null}
                          </div>
                        </div>
                      )}
                      {row.patient_intake_notes && (
                        <div>
                          <div className="font-medium text-muted-foreground mb-1">Intake notes</div>
                          <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-background p-2 rounded border max-h-64 max-w-full overflow-auto">
                            {row.patient_intake_notes.split('OpenAI Prompt:')[0]}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Confirm dialog for Decline / OON */}
        <Dialog open={!!actionRow} onOpenChange={(o) => { if (!o) { setActionRow(null); setActionNotes(''); setDeclineReason(''); setOtherNeedsReschedule(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionRow?.action === 'oon'
                  ? 'Mark as OON'
                  : actionRow?.id === '__BULK__'
                    ? `Decline ${selected.size} appointment${selected.size === 1 ? '' : 's'}`
                    : 'Decline appointment'}
              </DialogTitle>
              <DialogDescription>
                {actionRow?.action === 'oon'
                  ? 'Sets status to OON, keeps the appointment hidden from the project portal (admin-only via Review Queue → OON tab), and fires the OON Slack alert.'
                  : 'Cancels the appointment, syncs the cancellation to GHL, writes the reason to the patient’s GHL contact, and tags the contact so the reason-appropriate text and email are sent. The record stays hidden from the client portal and can be restored from the Declined tab.'}
              </DialogDescription>
            </DialogHeader>

            {actionRow?.action === 'declined' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Decline reason <span className="text-destructive">*</span></label>
                <Select value={declineReason} onValueChange={setDeclineReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SELECTABLE_DECLINE_REASONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Textarea
              placeholder={
                actionRow?.action === 'oon'
                  ? 'Optional note…'
                  : getDeclineReason(declineReason)?.requiresExplanation
                    ? 'Explanation (required)…'
                    : 'Additional details (optional)…'
              }
              value={actionNotes}
              onChange={e => setActionNotes(e.target.value)}
              rows={3}
            />

            {actionRow?.action === 'declined' && declineReason === 'other' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Rescheduling <span className="text-destructive">*</span></label>
                <RadioGroup
                  value={otherNeedsReschedule === null ? '' : otherNeedsReschedule ? 'yes' : 'no'}
                  onValueChange={(v) => setOtherNeedsReschedule(v === 'yes')}
                  className="gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="other-reschedule-yes" />
                    <label htmlFor="other-reschedule-yes" className="text-sm">Patient needs to be rescheduled</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="other-reschedule-no" />
                    <label htmlFor="other-reschedule-no" className="text-sm">Patient should not be rescheduled</label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  The rescheduling workflow only runs when “Patient needs to be rescheduled” is selected.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setActionRow(null); setActionNotes(''); setDeclineReason(''); setOtherNeedsReschedule(null); }}>Cancel</Button>
              <Button
                variant={actionRow?.action === 'oon' ? 'default' : 'destructive'}
                onClick={() => {
                  if (!actionRow) return;
                  const resolved = actionRow.action === 'declined'
                    ? resolveDeclineReasonValue(declineReason, otherNeedsReschedule)
                    : declineReason;
                  if (actionRow.id === '__BULK__') {
                    handleBulk('declined', actionNotes, resolved);
                  } else {
                    handleSingleAction(actionRow.id, actionRow.action, actionNotes, resolved);
                  }
                }}
                disabled={
                  processing ||
                  (actionRow?.action === 'declined' &&
                    (!declineReason ||
                      (!!getDeclineReason(declineReason)?.requiresExplanation && !actionNotes.trim()) ||
                      (declineReason === 'other' && otherNeedsReschedule === null)))
                }
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Duplicate action dialog */}
        <Dialog open={!!dupActionRow} onOpenChange={(o) => { if (!o) setDupActionRow(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dupActionRow?.action === 'replace' ? 'Approve and supersede existing appointment(s)' : 'Keep existing, dismiss new'}
              </DialogTitle>
              <DialogDescription>
                {dupActionRow?.action === 'replace'
                  ? 'This will APPROVE the new appointment and move the existing duplicate(s) listed below to history (superseded). No cancellation workflow will be triggered.'
                  : 'This will DISMISS the new queue item and leave the existing appointment untouched. No cancellation will be triggered.'}
              </DialogDescription>
            </DialogHeader>
            {dupActionRow && (
              <div className="space-y-2 text-sm">
                <div className="font-medium">New appointment</div>
                <div className="p-2 rounded border bg-muted/30">
                  {dupActionRow.row.lead_name} — {formatDate(dupActionRow.row.date_of_appointment)} {formatTime(dupActionRow.row.requested_time)}
                  <div className="text-xs text-muted-foreground">{dupActionRow.row.calendar_name || '—'}</div>
                </div>
                <div className="font-medium mt-2">
                  {dupActionRow.action === 'replace' ? 'Will be moved to history:' : 'Will keep:'}
                </div>
                <div className="space-y-1">
                  {(duplicatesByRowId[dupActionRow.row.id] || []).map(d => (
                    <div key={d.id} className="p-2 rounded border bg-muted/30 text-xs">
                      <Badge variant="outline" className="text-[10px] mr-2">{d.status || '—'}</Badge>
                      {formatDate(d.date_of_appointment)} {formatTime(d.requested_time)}
                      <span className="text-muted-foreground"> · {d.calendar_name || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDupActionRow(null)} disabled={processing}>Cancel</Button>
              <Button
                variant={dupActionRow?.action === 'replace' ? 'default' : 'secondary'}
                onClick={() => {
                  if (!dupActionRow) return;
                  if (dupActionRow.action === 'replace') handleReplaceExisting(dupActionRow.row);
                  else handleKeepExisting(dupActionRow.row);
                }}
                disabled={processing}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adopt-slot confirmation dialog */}
        <Dialog open={!!adoptSlotTarget} onOpenChange={(o) => { if (!o) setAdoptSlotTarget(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Use this slot for the active record?</DialogTitle>
              <DialogDescription>
                This will move the date and time onto the active record and permanently delete the duplicate record.
                The deleted record will NOT trigger any cancellation workflow.
              </DialogDescription>
            </DialogHeader>
            {adoptSlotTarget && (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium mb-1">Active record (will receive new slot)</div>
                  <div className="p-2 rounded border bg-muted/30">
                    {adoptSlotTarget.row.lead_name}
                    <div className="text-xs text-muted-foreground">
                      Current: {formatDate(adoptSlotTarget.row.date_of_appointment) || '—'} {formatTime(adoptSlotTarget.row.requested_time)}
                    </div>
                    <div className="text-xs text-amber-700 font-medium mt-1">
                      New: {formatDate(adoptSlotTarget.source.date_of_appointment) || '—'} {formatTime(adoptSlotTarget.source.requested_time)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-1">Duplicate record (will be deleted)</div>
                  <div className="p-2 rounded border bg-destructive/5 text-xs">
                    <Badge variant="outline" className="text-[10px] mr-2">{adoptSlotTarget.source.status || '—'}</Badge>
                    {formatDate(adoptSlotTarget.source.date_of_appointment)} {formatTime(adoptSlotTarget.source.requested_time)}
                    <span className="text-muted-foreground"> · {adoptSlotTarget.source.calendar_name || '—'}</span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdoptSlotTarget(null)} disabled={processing}>Cancel</Button>
              <Button
                variant="default"
                onClick={() => {
                  if (!adoptSlotTarget) return;
                  handleAdoptSlot(adoptSlotTarget.row, adoptSlotTarget.source);
                }}
                disabled={processing}
              >
                Use this slot &amp; delete duplicate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>




        {detailAppt && (
          <DetailedAppointmentView
            appointment={detailAppt}
            isOpen={!!detailAppt}
            onClose={() => setDetailAppt(null)}
            onDataRefresh={async () => {
              fetch();
              if (detailAppt?.id) {
                const { data } = await supabase
                  .from('all_appointments')
                  .select('*')
                  .eq('id', detailAppt.id)
                  .single();
                if (data) setDetailAppt(data as unknown as AllAppointment);
              }
            }}
            onDeleted={() => { setDetailAppt(null); fetch(); }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewQueue;
