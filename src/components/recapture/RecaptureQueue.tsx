import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, ExternalLink, Calendar as CalendarIcon, Phone, ArrowUpDown, RotateCcw, CheckCircle2, BarChart3, User, X } from 'lucide-react';
import DetailedAppointmentView from '@/components/appointments/DetailedAppointmentView';
import type { AllAppointment } from '@/components/appointments/types';
import RecaptureReports from './RecaptureReports';

type WorkStatus = 'pending' | 'engaging' | 'follow_up_required' | 'completed';
type LostType = 'cancelled' | 'no_show';
type Channel = 'call' | 'text' | 'email' | 'voicemail';
type AttemptResult = 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'disconnected' | 'wrong_number' | 'callback_requested' | 'not_interested' | 'other';
type Outcome = 'rebooked' | 'interested' | 'unable_to_reach' | 'declined_rebook' | 'scheduled_elsewhere' | 'not_interested' | 'dnc_requested' | 'invalid_contact' | 'other';

interface RecaptureCase {
  id: string;
  appointment_id: string | null;
  ghl_contact_id: string | null;
  project_name: string;
  patient_name: string | null;
  service_line: string | null;
  lost_type: LostType;
  lost_status_at_entry: string | null;
  appointment_date: string | null;
  entered_worklist_at: string;
  assigned_user_id: string | null;
  work_started_at: string | null;
  work_status: WorkStatus;
  outcome: Outcome | null;
  outcome_notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  rebooked_appointment_id: string | null;
  recovered: boolean;
  attempt_count: number;
  first_attempt_at: string | null;
  last_attempt_at: string | null;
  stale: boolean;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
}

interface RecaptureAttempt {
  id: string;
  case_id: string;
  channel: Channel;
  attempted_at: string;
  result: AttemptResult | null;
  note: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  pending: 'Pending',
  engaging: 'Engaging',
  follow_up_required: 'Follow-Up Required',
  completed: 'Completed',
};

const LOST_TYPE_LABELS: Record<LostType, string> = {
  cancelled: 'Cancelled',
  no_show: 'No-Show',
};

const CHANNEL_LABELS: Record<Channel, string> = {
  call: 'Call',
  text: 'Text',
  email: 'Email',
  voicemail: 'Voicemail',
};

const RESULT_LABELS: Record<AttemptResult, string> = {
  answered: 'Answered',
  voicemail: 'Left Voicemail',
  no_answer: 'No Answer',
  busy: 'Busy',
  disconnected: 'Disconnected',
  wrong_number: 'Wrong Number',
  callback_requested: 'Callback Requested',
  not_interested: 'Not Interested',
  other: 'Other',
};

const OUTCOME_LABELS: Record<Outcome, string> = {
  rebooked: 'Rebooked',
  interested: 'Interested / Will Rebook',
  unable_to_reach: 'Unable to Reach',
  declined_rebook: 'Declined Rebook',
  scheduled_elsewhere: 'Scheduled Elsewhere',
  not_interested: 'Not Interested',
  dnc_requested: 'DNC Requested',
  invalid_contact: 'Invalid Contact Info',
  other: 'Other',
};

const STATUS_TABS: { value: WorkStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'engaging', label: 'Engaging' },
  { value: 'follow_up_required', label: 'Follow-Up Required' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
];

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (isNaN(d.getTime())) return null;
  const diff = Math.floor((new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatPhone(p: string | null): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return p;
}

export default function RecaptureQueue() {
  const { user } = useAuth();
  const { isAdmin, hasManagementAccess, isReviewOnly, accessibleProjects } = useRole();
  const canManage = hasManagementAccess() || isAdmin();
  const isSetter = isReviewOnly();

  const [view, setView] = useState<'queue' | 'reports'>('queue');
  const [tab, setTab] = useState<WorkStatus | 'all'>('pending');
  const [cases, setCases] = useState<RecaptureCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [lostTypeFilter, setLostTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedCase, setSelectedCase] = useState<RecaptureCase | null>(null);
  const [attempts, setAttempts] = useState<RecaptureAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [projectLocationMap, setProjectLocationMap] = useState<Record<string, string>>({});

  // Dialogs
  const [attemptDialogOpen, setAttemptDialogOpen] = useState(false);
  const [attemptChannel, setAttemptChannel] = useState<Channel>('call');
  const [attemptResult, setAttemptResult] = useState<AttemptResult | ''>('');
  const [attemptNote, setAttemptNote] = useState('');
  const [savingAttempt, setSavingAttempt] = useState(false);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<WorkStatus>('pending');
  const [statusNote, setStatusNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeOutcome, setCompleteOutcome] = useState<Outcome | ''>('');
  const [completeNote, setCompleteNote] = useState('');
  const [rebookedApptId, setRebookedApptId] = useState('');
  const [savingComplete, setSavingComplete] = useState(false);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [users, setUsers] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  const [detailAppt, setDetailAppt] = useState<AllAppointment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchAllPages = async (build: () => any): Promise<any[]> => {
    const PAGE = 1000;
    const out: any[] = [];
    for (let page = 0; page < 50; page++) {
      const { data, error } = await build().range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      const rows = (data as any[]) || [];
      out.push(...rows);
      if (rows.length < PAGE) break;
    }
    return out;
  };

  const fetchCases = async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPages(() => {
        let q = supabase
          .from('recapture_cases' as any)
          .select('*')
          .order('entered_worklist_at', { ascending: false });

        if (isSetter() && accessibleProjects.length > 0) {
          q = q.in('project_name', accessibleProjects);
        }

        return q;
      });

      const assigneeIds = Array.from(new Set(rows.map((r: any) => r.assigned_user_id).filter(Boolean))) as string[];
      const completedByIds = Array.from(new Set(rows.map((r: any) => r.completed_by).filter(Boolean))) as string[];
      const userIds = Array.from(new Set([...assigneeIds, ...completedByIds]));
      const userMap = new Map<string, { full_name: string | null; email: string }>();
      if (userIds.length > 0) {
        for (let i = 0; i < userIds.length; i += 100) {
          const chunk = userIds.slice(i, i + 100);
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', chunk);
          for (const p of (profs as any[]) || []) {
            userMap.set(p.id, { full_name: p.full_name, email: p.email });
          }
        }
      }

      const enriched = (rows as RecaptureCase[]).map((r) => {
        const assignee = r.assigned_user_id ? userMap.get(r.assigned_user_id) : null;
        return {
          ...r,
          assignee_name: assignee?.full_name,
          assignee_email: assignee?.email,
        };
      });

      setCases(enriched);
    } catch (error: any) {
      console.error('Recapture cases fetch error:', error);
      toast({ title: 'Failed to load recapture cases', description: error?.message, variant: 'destructive' });
      setCases([]);
    }
    setLoading(false);
  };

  const fetchCasesRef = useRef(fetchCases);
  fetchCasesRef.current = fetchCases;

  useEffect(() => {
    fetchCasesRef.current();
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel('recapture-cases-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recapture_cases' }, () => {
        fetchCasesRef.current();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('projects').select('project_name, ghl_location_id');
      if (data) {
        const map: Record<string, string> = {};
        for (const p of data as any[]) {
          if (p.ghl_location_id && p.project_name) map[p.project_name] = p.ghl_location_id;
        }
        setProjectLocationMap(map);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name', { ascending: true });
      setUsers((data as any[]) || []);
    })();
  }, []);

  const loadAttempts = async (caseId: string) => {
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
      setAttempts((data as RecaptureAttempt[]) || []);
    }
    setLoadingAttempts(false);
  };

  const openDetail = async (c: RecaptureCase) => {
    setSelectedCase(c);
    await loadAttempts(c.id);
    if (c.appointment_id) {
      setDetailLoading(true);
      const { data, error } = await supabase.from('all_appointments').select('*').eq('id', c.appointment_id).single();
      setDetailLoading(false);
      if (!error && data) setDetailAppt(data as unknown as AllAppointment);
    }
  };

  const ghlUrlFor = (c: RecaptureCase): string | null => {
    if (!c.ghl_contact_id) return null;
    const loc = projectLocationMap[c.project_name];
    if (!loc) return null;
    return `https://app.gohighlevel.com/v2/location/${loc}/contacts/detail/${c.ghl_contact_id}`;
  };

  const filteredCases = useMemo(() => {
    let list = [...cases];
    if (tab !== 'all') list = list.filter((c) => c.work_status === tab);
    if (projectFilter !== 'all') list = list.filter((c) => c.project_name === projectFilter);
    if (lostTypeFilter !== 'all') list = list.filter((c) => c.lost_type === lostTypeFilter);
    if (dateFrom) list = list.filter((c) => c.entered_worklist_at && new Date(c.entered_worklist_at) >= dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      list = list.filter((c) => c.entered_worklist_at && new Date(c.entered_worklist_at) <= end);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.patient_name || '').toLowerCase().includes(s) ||
          (c.lead_phone_number || '').includes(s) ||
          (c.lead_email || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [cases, tab, projectFilter, lostTypeFilter, dateFrom, dateTo, search]);

  const counts = useMemo(() => {
    return {
      pending: cases.filter((c) => c.work_status === 'pending').length,
      engaging: cases.filter((c) => c.work_status === 'engaging').length,
      follow_up_required: cases.filter((c) => c.work_status === 'follow_up_required').length,
      completed: cases.filter((c) => c.work_status === 'completed').length,
      all: cases.length,
    };
  }, [cases]);

  const projects = useMemo(() => Array.from(new Set(cases.map((c) => c.project_name))).sort(), [cases]);

  const saveAttempt = async () => {
    if (!selectedCase) return;
    setSavingAttempt(true);
    try {
      const { error } = await supabase.from('recapture_attempts' as any).insert({
        case_id: selectedCase.id,
        channel: attemptChannel,
        result: attemptResult || null,
        note: attemptNote.trim() || null,
        user_id: user?.id,
        user_name: user?.email,
      });
      if (error) throw error;

      await supabase
        .from('recapture_cases' as any)
        .update({ work_status: 'engaging', work_started_at: selectedCase.work_started_at || new Date().toISOString() })
        .eq('id', selectedCase.id);

      toast({ title: 'Attempt logged' });
      setAttemptDialogOpen(false);
      setAttemptChannel('call');
      setAttemptResult('');
      setAttemptNote('');
      await loadAttempts(selectedCase.id);
      await fetchCases();
    } catch (e: any) {
      toast({ title: 'Failed to log attempt', description: e.message, variant: 'destructive' });
    }
    setSavingAttempt(false);
  };

  const saveStatus = async () => {
    if (!selectedCase) return;
    setSavingStatus(true);
    try {
      const update: any = { work_status: newStatus };
      if (newStatus === 'engaging' && !selectedCase.work_started_at) update.work_started_at = new Date().toISOString();
      const { error } = await supabase.from('recapture_cases' as any).update(update).eq('id', selectedCase.id);
      if (error) throw error;
      toast({ title: 'Status updated' });
      setStatusDialogOpen(false);
      setStatusNote('');
      await fetchCases();
    } catch (e: any) {
      toast({ title: 'Failed to update status', description: e.message, variant: 'destructive' });
    }
    setSavingStatus(false);
  };

  const saveComplete = async () => {
    if (!selectedCase || !completeOutcome) return;
    setSavingComplete(true);
    try {
      const rebookedId = completeOutcome === 'rebooked' && rebookedApptId.trim() ? rebookedApptId.trim() : null;
      const update: any = {
        work_status: 'completed',
        outcome: completeOutcome,
        outcome_notes: completeNote.trim() || null,
        completed_at: new Date().toISOString(),
        completed_by: user?.id,
      };
      if (rebookedId) {
        update.rebooked_appointment_id = rebookedId;
        update.recovered = true;
      }
      const { error } = await supabase.from('recapture_cases' as any).update(update).eq('id', selectedCase.id);
      if (error) throw error;
      toast({ title: 'Case completed' });
      setCompleteDialogOpen(false);
      setCompleteOutcome('');
      setCompleteNote('');
      setRebookedApptId('');
      await fetchCases();
    } catch (e: any) {
      toast({ title: 'Failed to complete case', description: e.message, variant: 'destructive' });
    }
    setSavingComplete(false);
  };

  const saveAssign = async () => {
    if (!selectedCase) return;
    setSavingAssign(true);
    try {
      const update: any = { assigned_user_id: assigneeId || null };
      if (assigneeId && !selectedCase.work_started_at) update.work_started_at = new Date().toISOString();
      const { error } = await supabase.from('recapture_cases' as any).update(update).eq('id', selectedCase.id);
      if (error) throw error;
      toast({ title: assigneeId ? 'Case assigned' : 'Case unassigned' });
      setAssignDialogOpen(false);
      setAssigneeId('');
      await fetchCases();
    } catch (e: any) {
      toast({ title: 'Failed to assign case', description: e.message, variant: 'destructive' });
    }
    setSavingAssign(false);
  };

  const openPortalRecord = (c: RecaptureCase) => {
    if (c.appointment_id) openDetail(c);
  };

  const lostTypeBadge = (t: LostType) => {
    if (t === 'cancelled') return <Badge variant="outline" className="border-rose-500 bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200">Cancelled</Badge>;
    return <Badge variant="outline" className="border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">No-Show</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Recapture Worklist</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === 'queue' ? 'default' : 'outline'} size="sm" onClick={() => setView('queue')}>
            Queue
          </Button>
          <Button variant={view === 'reports' ? 'default' : 'outline'} size="sm" onClick={() => setView('reports')}>
            <BarChart3 className="h-4 w-4 mr-1" /> Reports
          </Button>
        </div>
      </div>

      {view === 'reports' ? (
        <RecaptureReports />
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as WorkStatus | 'all')} className="w-full">
            <TabsList className="h-auto flex-wrap">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                  <Badge variant="secondary" className="ml-2">{counts[t.value]}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Input
                  placeholder="Name / phone / email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[220px]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Clinic</label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clinics</SelectItem>
                  {projects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Lost Type</label>
              <Select value={lostTypeFilter} onValueChange={setLostTypeFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No-Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'MMM d, yyyy') : <span className="text-muted-foreground">Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'MMM d, yyyy') : <span className="text-muted-foreground">Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                <X className="h-4 w-4 mr-1" /> Clear dates
              </Button>
            )}
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Lost Type</TableHead>
                  <TableHead>Lost Date</TableHead>
                  <TableHead>Days Since</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No recapture cases found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases.map((c) => {
                    const days = daysSince(c.appointment_date || c.entered_worklist_at);
                    const ghlUrl = ghlUrlFor(c);
                    return (
                      <TableRow key={c.id} className={cn(c.stale && 'opacity-60')}>
                        <TableCell>
                          <div className="font-medium">{c.patient_name || '—'}</div>
                        </TableCell>
                        <TableCell className="text-sm">{c.project_name}</TableCell>
                        <TableCell>{lostTypeBadge(c.lost_type)}</TableCell>
                        <TableCell className="text-sm">
                          {c.appointment_date ? format(parseISO(c.appointment_date), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{days !== null ? `${days}d` : '—'}</TableCell>
                        <TableCell className="text-sm">{c.service_line || '—'}</TableCell>
                        <TableCell className="text-sm">{c.attempt_count}</TableCell>
                        <TableCell className="text-sm">{c.assignee_name || c.assignee_email || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Badge variant={c.work_status === 'completed' ? 'default' : c.work_status === 'pending' ? 'secondary' : 'outline'}>
                            {WORK_STATUS_LABELS[c.work_status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {c.appointment_id && (
                              <Button variant="ghost" size="sm" onClick={() => openPortalRecord(c)}>
                                Open
                              </Button>
                            )}
                            {ghlUrl && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={ghlUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedCase(c); setAssigneeId(c.assigned_user_id || ''); setAssignDialogOpen(true); }}>
                              {c.assigned_user_id ? 'Reassign' : 'Claim'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedCase(c); setNewStatus(c.work_status); setStatusDialogOpen(true); }}>
                              Status
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedCase(c); setAttemptDialogOpen(true); }}>
                              Log Attempt
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedCase(c); setCompleteDialogOpen(true); }}>
                              Complete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!selectedCase && !attemptDialogOpen && !statusDialogOpen && !completeDialogOpen && !assignDialogOpen} onOpenChange={(open) => { if (!open) { setSelectedCase(null); setDetailAppt(null); setAttempts([]); } }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedCase?.patient_name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 py-6">
            {selectedCase && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Clinic</span><div className="font-medium">{selectedCase.project_name}</div></div>
                  <div><span className="text-muted-foreground">Lost Type</span><div>{lostTypeBadge(selectedCase.lost_type)}</div></div>
                  <div><span className="text-muted-foreground">Lost Status</span><div className="font-medium">{selectedCase.lost_status_at_entry || '—'}</div></div>
                  <div><span className="text-muted-foreground">Service</span><div className="font-medium">{selectedCase.service_line || '—'}</div></div>
                  <div><span className="text-muted-foreground">Entered Worklist</span><div className="font-medium">{selectedCase.entered_worklist_at ? format(parseISO(selectedCase.entered_worklist_at), 'MMM d, yyyy h:mm a') : '—'}</div></div>
                  <div><span className="text-muted-foreground">Work Status</span><div className="font-medium">{WORK_STATUS_LABELS[selectedCase.work_status]}</div></div>
                  <div><span className="text-muted-foreground">Attempts</span><div className="font-medium">{selectedCase.attempt_count}</div></div>
                  <div><span className="text-muted-foreground">Last Attempt</span><div className="font-medium">{selectedCase.last_attempt_at ? format(parseISO(selectedCase.last_attempt_at), 'MMM d, yyyy h:mm a') : '—'}</div></div>
                </div>

                {selectedCase.stale && (
                  <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    This case is stale — the source appointment is no longer in a cancelled/no-show state.
                  </div>
                )}

                {detailLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : detailAppt ? (
                  <DetailedAppointmentView appointment={detailAppt} onClose={() => setDetailAppt(null)} />
                ) : selectedCase.appointment_id ? (
                  <p className="text-sm text-muted-foreground">Could not load appointment details.</p>
                ) : null}

                <div>
                  <h3 className="text-sm font-semibold mb-2">Outreach Attempts</h3>
                  {loadingAttempts ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : attempts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No attempts logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {attempts.map((a) => (
                        <div key={a.id} className="rounded-md border p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{CHANNEL_LABELS[a.channel]}</span>
                            <span className="text-muted-foreground">{format(parseISO(a.attempted_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                          {a.result && <div className="text-muted-foreground">{RESULT_LABELS[a.result]}</div>}
                          {a.note && <div className="mt-1">{a.note}</div>}
                          {a.user_name && <div className="text-xs text-muted-foreground mt-1">by {a.user_name}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Log Attempt Dialog */}
      <Dialog open={attemptDialogOpen} onOpenChange={setAttemptDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Outreach Attempt</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Channel</label>
              <Select value={attemptChannel} onValueChange={(v) => setAttemptChannel(v as Channel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANNEL_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Result</label>
              <Select value={attemptResult} onValueChange={(v) => setAttemptResult(v as AttemptResult)}>
                <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RESULT_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Note</label>
              <Textarea value={attemptNote} onChange={(e) => setAttemptNote(e.target.value)} placeholder="Details about the attempt..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttemptDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveAttempt} disabled={savingAttempt}>
              {savingAttempt && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Attempt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Work Status</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as WorkStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(WORK_STATUS_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Optional internal note..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveStatus} disabled={savingStatus}>
              {savingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Recapture Case</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Outcome</label>
              <Select value={completeOutcome} onValueChange={(v) => setCompleteOutcome(v as Outcome)}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(OUTCOME_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {completeOutcome === 'rebooked' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Rebooked Appointment ID</label>
                <Input value={rebookedApptId} onChange={(e) => setRebookedApptId(e.target.value)} placeholder="UUID of new appointment" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} placeholder="Final outcome notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveComplete} disabled={savingComplete || !completeOutcome}>
              {savingComplete && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Case</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveAssign} disabled={savingAssign}>
              {savingAssign && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
