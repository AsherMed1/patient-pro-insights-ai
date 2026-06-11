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
import { Check, X, AlertTriangle, RefreshCw, Search, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ChevronsUpDown, Undo2, Trash2, Copy, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserAttribution } from '@/hooks/useUserAttribution';
import DetailedAppointmentView from '@/components/appointments/DetailedAppointmentView';
import type { AllAppointment } from '@/components/appointments/types';
import { formatDate, formatTime } from '@/components/appointments/utils';

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
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
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
type QueueView = 'pending' | 'declined';

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
  const [processing, setProcessing] = useState(false);
  const [detailAppt, setDetailAppt] = useState<AllAppointment | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [queueView, setQueueView] = useState<QueueView>('pending');
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
      if (newDob) updatePayload.dob = newDob;

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

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
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
    return [...rows].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    });
  }, [rows, sortKey, sortDir]);


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
      .select('id, lead_name, lead_phone_number, lead_email, project_name, calendar_name, date_of_appointment, requested_time, date_appointment_created, status, patient_intake_notes, parsed_pathology_info, parsed_insurance_info, parsed_demographics, dob, ghl_id, review_status, created_at, reviewed_at, reviewed_by, review_notes')
      .eq('review_status', queueView)
      .or('is_reserved_block.is.null,is_reserved_block.eq.false')
      .not('project_name', 'in', '("ECCO Medical","Premier Vascular","Premier Vascular Surgery")')
      .limit(500);

    if (queueView === 'declined') {
      q = q.order('reviewed_at', { ascending: false, nullsFirst: false });
    } else {
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
    const base = (status: string) =>
      supabase
        .from('all_appointments')
        .select('id', { count: 'exact', head: true })
        .eq('review_status', status)
        .or('is_reserved_block.is.null,is_reserved_block.eq.false')
        .not('project_name', 'in', '("ECCO Medical","Premier Vascular","Premier Vascular Surgery")');
    const [{ count: pc }, { count: dc }] = await Promise.all([base('pending'), base('declined')]);
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

  const handleReplaceExisting = async (row: ReviewAppointment) => {
    const dups = duplicatesByRowId[row.id] || [];
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Approve the new row first
      const ok = await performAction(row.id, 'approved', 'Replaced existing duplicate appointment(s)');
      if (!ok) { setProcessing(false); return; }

      const newWhen = `${row.date_of_appointment || 'unscheduled'} ${row.requested_time || ''}`.trim();
      for (const d of dups) {
        try {
          await supabase
            .from('all_appointments')
            .update({
              status: 'Cancelled',
              internal_process_complete: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', d.id);

          const utcTimestamp = new Date().toISOString();
          await supabase.from('appointment_notes').insert({
            appointment_id: d.id,
            note_text: `Superseded by newer appointment ${newWhen} via Review Queue by ${userName || 'Unknown'} - [[timestamp:${utcTimestamp}]]`,
            created_by: userName || 'Review Queue',
          });
        } catch (e) {
          console.warn('replace-existing per-duplicate failed', e);
        }
      }

      toast({ title: 'Replaced existing', description: `Approved new; cancelled ${dups.length} prior appt(s)` });
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
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' });
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




  const performAction = async (id: string, action: ActionType, notes?: string) => {
    setProcessing(true);
    try {
      const { data: priorRow } = await supabase
        .from('all_appointments')
        .select('review_status, lead_name, lead_phone_number, calendar_name, project_name, status, ghl_id')
        .eq('id', id)
        .single();

      const update: any = {
        review_status: action,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      };
      const { data: { user } } = await supabase.auth.getUser();
      if (user) update.reviewed_by = user.id;

      if (action === 'oon') {
        update.status = 'OON';
        update.internal_process_complete = true;
        update.procedure_ordered = false;
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
        notes: notes || null,
      });

      // Audit log
      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment',
          p_action: `review_${action}`,
          p_description: `${action === 'oon' ? 'Marked as OON' : action === 'approved' ? 'Approved' : 'Declined'}: ${priorRow?.lead_name ?? id} by ${userName || 'Unknown'}`,
          p_source: 'review_queue',
          p_metadata: { appointment_id: id, project_name: priorRow?.project_name, notes: notes || null },
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
              },
            });
            console.log('update-ghl-contact-tags response:', { tagData, tagErr });
            if (tagErr) {
              console.error('update-ghl-contact-tags failed:', tagErr);
              toast({
                title: 'Approved, but GHL tag not added',
                description: 'Review status was saved, but adding the "approved" tag in GHL failed.',
                variant: 'destructive',
              });
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
      }
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' });
      setProcessing(false);
      return false;
    }
    setProcessing(false);
    return true;
  };

  const handleSingleAction = async (id: string, action: ActionType, notes?: string) => {
    const ok = await performAction(id, action, notes);
    if (ok) {
      toast({ title: `Appointment ${action === 'oon' ? 'marked as OON' : action}` });
      setRows(prev => prev.filter(r => r.id !== id));
      setActionRow(null);
      setActionNotes('');
      fetchCounts();
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
          reviewed_at: null,
          reviewed_by: null,
          review_notes: null,
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

  const handleBulk = async (action: ActionType) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    let ok = 0;
    for (const id of ids) {
      const success = await performAction(id, action);
      if (success) ok++;
    }
    toast({ title: `${ok} of ${ids.length} ${action === 'oon' ? 'marked OON' : action}` });
    setRows(prev => prev.filter(r => !selected.has(r.id)));
    setSelected(new Set());
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              Review Queue
            </CardTitle>
            <CardDescription>
              New appointments wait here until you Approve, Decline, or mark them as OON. Client portals only see appointments that have been Approved (or marked OON). Mistakenly declined appointments can be restored from the Declined tab.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetch(); fetchCounts(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
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
        </div>

        {/* Bulk actions (pending only) */}
        {!isDeclinedView && selected.size > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
            <span className="text-sm font-medium mr-2">{selected.size} selected</span>
            <Button size="sm" variant="default" onClick={() => handleBulk('approved')} disabled={processing}>
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleBulk('declined')} disabled={processing}>
              <X className="h-4 w-4 mr-1" /> Decline
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
            {isDeclinedView ? 'No declined appointments.' : '🎉 No appointments waiting for review.'}
          </div>
        ) : (
          <div className="border rounded-md divide-y">
            <div className="grid grid-cols-[28px_minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(220px,1.6fr)_minmax(120px,0.9fr)_300px] gap-3 p-3 text-xs font-medium text-muted-foreground bg-muted/40 items-center">
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
                  <div className="grid grid-cols-[28px_minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(220px,1.6fr)_minmax(120px,0.9fr)_300px] gap-3 p-3 items-center text-sm">
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
                    <div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleExpand(row.id)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Toggle inline details"
                        >
                          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => openDetail(row.id)}
                          className="font-medium hover:underline text-left text-primary"
                          disabled={detailLoading === row.id}
                        >
                          {row.lead_name}{detailLoading === row.id ? '…' : ''}
                        </button>
                        {!isDeclinedView && duplicatesByRowId[row.id]?.length > 0 && (
                          <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 text-[10px] py-0 h-5">
                            <Copy className="h-2.5 w-2.5 mr-1" />
                            Duplicate ({duplicatesByRowId[row.id].length})
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.lead_phone_number || '—'}</div>
                      {isDeclinedView && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Declined {row.reviewed_at ? formatDate(row.reviewed_at) : '—'} by {reviewerLabel}
                        </div>
                      )}
                    </div>
                    <div className="text-xs">{row.project_name}</div>
                    <div className="text-xs">
                      <div>{path.procedure_type || '—'}</div>
                      <div className="text-muted-foreground truncate">{row.calendar_name || '—'}</div>
                    </div>
                    <div className="text-xs">
                      <div>{formatDate(row.date_of_appointment)}</div>
                      <div className="text-muted-foreground">{formatTime(row.requested_time)}</div>
                    </div>
                    <div className="flex gap-1 justify-end">
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
                                title="Approve new appt and cancel the existing duplicate(s)"
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
                            onClick={() => handleSingleAction(row.id, 'approved')}
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
                            onClick={() => { setActionRow({ id: row.id, action: 'declined' }); setActionNotes(''); }}
                            disabled={processing}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Decline
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
                                <button
                                  className="text-primary hover:underline ml-auto"
                                  onClick={() => openDetail(d.id)}
                                >
                                  View
                                </button>
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <div className="font-medium text-muted-foreground">Email</div>
                          <div>{row.lead_email || '—'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground">DOB</div>
                          <div>{row.dob || demo.dob || '—'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground">Location</div>
                          <div>{path.location || '—'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground">Insurance</div>
                          <div>{ins.provider || ins.plan || '—'}</div>
                        </div>
                      </div>
                      {isDeclinedView && row.review_notes && (
                        <div>
                          <div className="font-medium text-muted-foreground mb-1">Decline reason</div>
                          <div className="whitespace-pre-wrap bg-background p-2 rounded border">
                            {row.review_notes}
                          </div>
                        </div>
                      )}
                      {row.patient_intake_notes && (
                        <div>
                          <div className="font-medium text-muted-foreground mb-1">Intake notes</div>
                          <div className="whitespace-pre-wrap bg-background p-2 rounded border max-h-64 overflow-auto">
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

        {/* Confirm dialog for Decline / OON with notes */}
        <Dialog open={!!actionRow} onOpenChange={(o) => { if (!o) { setActionRow(null); setActionNotes(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionRow?.action === 'oon' ? 'Mark as OON' : 'Decline appointment'}
              </DialogTitle>
              <DialogDescription>
                {actionRow?.action === 'oon'
                  ? 'Sets status to OON, releases the appointment to the project portal, and fires the OON Slack alert.'
                  : 'Hides this appointment from the client portal and reports. The record stays in the database for audit and can be restored from the Declined tab.'}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder={actionRow?.action === 'oon' ? 'Optional note…' : 'Reason (duplicate, spam, wrong project, test, other)…'}
              value={actionNotes}
              onChange={e => setActionNotes(e.target.value)}
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setActionRow(null); setActionNotes(''); }}>Cancel</Button>
              <Button
                variant={actionRow?.action === 'oon' ? 'default' : 'destructive'}
                onClick={() => actionRow && handleSingleAction(actionRow.id, actionRow.action, actionNotes)}
                disabled={processing}
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
                {dupActionRow?.action === 'replace' ? 'Replace existing appointment(s)' : 'Keep existing, dismiss new'}
              </DialogTitle>
              <DialogDescription>
                {dupActionRow?.action === 'replace'
                  ? 'This will APPROVE the new appointment and CANCEL the existing duplicate(s) listed below. A note will be added to each cancelled record.'
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
                  {dupActionRow.action === 'replace' ? 'Will cancel:' : 'Will keep:'}
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
