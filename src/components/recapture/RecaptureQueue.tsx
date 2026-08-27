import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, ExternalLink, Calendar as CalendarIcon, BarChart3, X, MoreHorizontal } from 'lucide-react';
import DetailedAppointmentView from '@/components/appointments/DetailedAppointmentView';
import type { AllAppointment } from '@/components/appointments/types';
import RecaptureReports from './RecaptureReports';

import RecaptureCaseDrawer from './RecaptureCaseDrawer';
import {
  WORK_STATUS_LABELS,
  followUpCountdown,
  type LostType, type RecaptureCase, type WorkStatus,
} from './types';

type TabValue = WorkStatus | 'all';

const STATUS_TABS: { value: TabValue; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'opened', label: 'Opened' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
];

function formatPhone(p: string | null): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return p;
}

export default function RecaptureQueue() {
  const { user } = useAuth();
  const { isAdmin, hasManagementAccess, isReviewOnly, isRecaptureRole, accessibleProjects } = useRole();
  const isSetter = () => isReviewOnly() || isRecaptureRole();

  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<'queue' | 'reports'>('queue');
  const [tab, setTab] = useState<TabValue>('new');
  const [cases, setCases] = useState<RecaptureCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [lostTypeFilter, setLostTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedCase, setSelectedCase] = useState<RecaptureCase | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [projectLocationMap, setProjectLocationMap] = useState<Record<string, string>>({});

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [users, setUsers] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  const [detailAppt, setDetailAppt] = useState<AllAppointment | null>(null);

  // Keeps follow-up countdowns ticking without a refresh.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

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

  /** Bell reminders for follow-ups that just came due on my own cases. */
  useEffect(() => {
    if (!user?.id || cases.length === 0) return;
    const due = cases.filter((c) => {
      if (c.work_status !== 'follow_up' || !c.follow_up_at) return false;
      const owner = c.assigned_user_id || c.opened_by;
      if (owner !== user.id) return false;
      return new Date(c.follow_up_at).getTime() <= Date.now();
    });
    if (due.length === 0) return;
    (async () => {
      const rows = due.slice(0, 25).map((c) => ({
        mentioned_user_id: user.id,
        mentioned_by_user_id: user.id,
        mentioned_by_name: 'System',
        kind: 'recapture_follow_up_due',
        title: `Follow-up due: ${c.patient_name || 'Patient'} (${c.follow_up_at})`,
        body: `The scheduled Recapture follow-up for ${c.patient_name || 'this patient'} at ${c.project_name} is now due.`,
        appointment_id: c.appointment_id,
        recapture_case_id: c.id,
      }));
      const { error } = await supabase
        .from('qa_note_mentions' as any)
        .upsert(rows as any, {
          onConflict: 'recapture_case_id,mentioned_user_id,kind,title',
          ignoreDuplicates: true,
        });
      if (error) console.warn('[recapture] follow-up reminder failed', error.message);
    })();
  }, [cases, user?.id]);

  const openDetail = async (c: RecaptureCase) => {
    setSelectedCase(c);
    if (c.appointment_id) {
      const { data, error } = await supabase.from('all_appointments').select('*').eq('id', c.appointment_id).single();
      if (!error && data) setDetailAppt(data as unknown as AllAppointment);
    }
  };

  const ghlUrlFor = (c: RecaptureCase): string | null => {
    if (!c.ghl_contact_id) return null;
    const loc = projectLocationMap[c.project_name];
    if (!loc) return null;
    return `https://app.gohighlevel.com/v2/location/${loc}/contacts/detail/${c.ghl_contact_id}`;
  };

  /** Everything except the bucket filter — bucket counts are derived from this. */
  const filteredIgnoringTab = useMemo(() => {
    let list = [...cases];
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
  }, [cases, projectFilter, lostTypeFilter, dateFrom, dateTo, search]);

  const filteredCases = useMemo(
    () => (tab === 'all' ? filteredIgnoringTab : filteredIgnoringTab.filter((c) => c.work_status === tab)),
    [filteredIgnoringTab, tab],
  );

  /** Counts always describe exactly what the active search/filters return. */
  const counts = useMemo(() => {
    const byStatus = (s: WorkStatus) => filteredIgnoringTab.filter((c) => c.work_status === s).length;
    return {
      new: byStatus('new'),
      opened: byStatus('opened'),
      nurture: byStatus('nurture'),
      follow_up: byStatus('follow_up'),
      completed: byStatus('completed'),
      all: filteredIgnoringTab.length,
    } as Record<TabValue, number>;
  }, [filteredIgnoringTab]);

  const projects = useMemo(() => Array.from(new Set(cases.map((c) => c.project_name))).sort(), [cases]);

  /** Live in-place patch so a saved outcome shows before the row repositions. */
  const patchCase = useCallback((id: string, update: Partial<RecaptureCase>) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...update } : c)));
    setSelectedCase((prev) => (prev && prev.id === id ? { ...prev, ...update } : prev));
  }, []);

  const openCase = useCallback((c: RecaptureCase) => {
    setSelectedCase(c);
    setDrawerOpen(true);
  }, []);

  // Deep link from a bell notification: ?recaptureCase=<id>
  const deepLinkId = searchParams.get('recaptureCase');
  useEffect(() => {
    if (!deepLinkId || cases.length === 0) return;
    const match = cases.find((c) => c.id === deepLinkId);
    if (!match) return;
    setTab('all');
    openCase(match);
    const next = new URLSearchParams(searchParams);
    next.delete('recaptureCase');
    setSearchParams(next, { replace: true });
  }, [deepLinkId, cases, openCase, searchParams, setSearchParams]);

  const saveAssign = async () => {
    if (!selectedCase) return;
    setSavingAssign(true);
    try {
      const update: any = { assigned_user_id: assigneeId || null };
      if (assigneeId && !selectedCase.work_started_at) update.work_started_at = new Date().toISOString();
      const { error } = await supabase.from('recapture_cases' as any).update(update).eq('id', selectedCase.id);
      if (error) throw error;
      const assignedProfile = users.find((u) => u.id === assigneeId);
      void logRecaptureActivity({
        caseId: selectedCase.id,
        activityType: 'assignment',
        description: assigneeId
          ? `Claimed / assigned to ${assignedProfile?.full_name || assignedProfile?.email || 'user'}`
          : 'Assignment cleared',
        actorUserId: assigneeId || user?.id || null,
        actorName: assignedProfile?.full_name || assignedProfile?.email || user?.email || null,
      });
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

  const showStatusColumn = tab === 'follow_up';
  const columnCount = showStatusColumn ? 7 : 6;

  const followUpCell = (c: RecaptureCase) => {
    const cd = followUpCountdown(c.follow_up_at);
    if (!cd) return <span className="text-muted-foreground">—</span>;
    return (
      <Badge variant={cd.overdue ? 'destructive' : cd.due ? 'default' : 'outline'} className="whitespace-nowrap">
        {cd.short}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Recapture Worklist</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === 'queue' ? 'default' : 'outline'} size="sm" onClick={() => setView('queue')}>
            Queue
          </Button>
          <Button variant={view === 'reports' ? 'default' : 'outline'} size="sm" onClick={() => setView('reports')}>
            <BarChart3 className="mr-1 h-4 w-4" /> Reports
          </Button>
        </div>
      </div>

      {view === 'reports' ? (
        <RecaptureReports />
      ) : (
        <>
          {/* Frozen queue controls: buckets, search and filters stay put while scrolling */}
          <div
            className="sticky z-20 -mx-4 space-y-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6"
            style={{ top: 'calc(var(--portal-header-h, 0px) + var(--portal-nav-h, 0px))' }}
          >
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="w-full">
              <TabsList className="h-auto flex-wrap">
                {STATUS_TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                    <Badge variant="secondary" className="ml-2">{counts[t.value]}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Search</label>
                <Input
                  placeholder="Name / phone / email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-[220px]"
                />
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
                  <X className="mr-1 h-4 w-4" /> Clear dates
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-md border">
            <Table
              className="min-w-max"
              containerClassName="max-h-[calc(100vh-var(--portal-header-h,0px)-var(--portal-nav-h,0px)-260px)] overflow-auto"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-20 bg-background">Patient</TableHead>
                  {showStatusColumn && <TableHead className="sticky top-0 z-20 bg-background">Status</TableHead>}
                  <TableHead className="sticky top-0 z-20 bg-background">Clinic</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-background">Type</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-background">Service Line</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-background">Contact Attempts</TableHead>
                  <TableHead className="sticky right-0 top-0 z-30 w-[240px] min-w-[240px] border-l bg-background text-right whitespace-nowrap">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columnCount} className="py-8 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnCount} className="py-8 text-center text-muted-foreground">
                      No recapture cases found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases.map((c) => {
                    const ghlUrl = ghlUrlFor(c);
                    return (
                      <TableRow key={c.id} className={cn(c.stale && 'opacity-60')}>
                        <TableCell>
                          <div className="font-medium">{c.patient_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPhone(c.lead_phone_number || null)}
                          </div>
                        </TableCell>
                        {showStatusColumn && <TableCell>{followUpCell(c)}</TableCell>}
                        <TableCell className="text-sm">{c.project_name}</TableCell>
                        <TableCell>{lostTypeBadge(c.lost_type)}</TableCell>
                        <TableCell className="text-sm">{c.service_line || '—'}</TableCell>
                        <TableCell className="text-sm">{c.attempt_count}</TableCell>
                        <TableCell className="sticky right-0 z-10 w-[240px] min-w-[240px] border-l bg-background text-right whitespace-nowrap">
                          <div className="flex flex-nowrap items-center justify-end gap-2">
                            <Button variant="default" size="sm" onClick={() => openCase(c)}>
                              Open Record
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {c.appointment_id && (
                                  <DropdownMenuItem onClick={() => openPortalRecord(c)}>
                                    Open appointment
                                  </DropdownMenuItem>
                                )}
                                {ghlUrl && (
                                  <DropdownMenuItem asChild>
                                    <a href={ghlUrl} target="_blank" rel="noopener noreferrer" className="flex cursor-pointer items-center gap-2">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Open in GHL
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => { setSelectedCase(c); setAssigneeId(c.assigned_user_id || ''); setAssignDialogOpen(true); }}>
                                  {c.assigned_user_id ? 'Reassign' : 'Claim'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Case Drawer */}
      <RecaptureCaseDrawer
        caseRow={selectedCase}
        open={drawerOpen}
        onOpenChange={(o) => { setDrawerOpen(o); if (!o) setSelectedCase(null); }}
        onChanged={fetchCases}
        onCasePatched={patchCase}
        onOpenPortalRecord={(c) => openDetail(c)}
        ghlUrl={selectedCase ? ghlUrlFor(selectedCase) : null}
      />

      {detailAppt && (
        <DetailedAppointmentView
          isOpen={!!detailAppt}
          appointment={detailAppt}
          onClose={() => setDetailAppt(null)}
          onDataRefresh={() => { fetchCases(); }}
        />
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Case</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
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
