import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, ExternalLink, Ticket, Calendar as CalendarIcon, Maximize2, Clock } from 'lucide-react';
import DetailedAppointmentView from '@/components/appointments/DetailedAppointmentView';
import { renderWithLinks } from '@/lib/linkify';

type WorkflowStatus = 'new' | 'in_review' | 'pending_escalated' | 'completed' | 'reopened';
type AlertType = 'short_notice' | 'oon' | 'confirmed_audit' | 'review_queue';

const ACTIVE_ALERT_TYPES: AlertType[] = ['short_notice', 'oon', 'confirmed_audit', 'review_queue'];

interface QACase {
  id: string;
  appointment_id: string | null;
  ghl_contact_id: string | null;
  project_name: string;
  patient_name: string | null;
  service_line: string | null;
  appointment_date: string | null;
  appointment_status: string | null;
  alert_type: AlertType;
  workflow_status: WorkflowStatus;
  assigned_qs_user_id: string | null;
  entered_queue_at: string;
  last_alert_activity_at: string;
  first_entered_at: string;
  completed_at: string | null;
  controlhub_ticket_id: string | null;
  controlhub_ticket_url: string | null;
  qa_name: string | null;
  self_booked: boolean | null;
  patient_link: string | null;
  error_category: string | null;
  error_source: string | null;
  caught_before_clinic: boolean | null;
  resolution_type: string | null;
  date_resolved: string | null;
  ticket_created: boolean;
  review_entered_at: string | null;
  review_resolved_at: string | null;
}

interface QANote {
  id: string;
  case_id: string;
  note: string;
  author_name: string | null;
  created_at: string;
}

interface QAActivity {
  id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
  metadata: any;
}

const STATUS_TABS: { value: WorkflowStatus | 'all'; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in_review', label: 'In Review' },
  { value: 'pending_escalated', label: 'Pending / Escalated' },
  
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
];

const ACTIVITY_LABELS: Record<string, string> = {
  created: 'Case created',
  alert_repeat: 'Repeat alert',
  realerted: 'Re-alerted — returned to New',
  status_change: 'Status changed',
  audit_update: 'Audit updated',
  reopened: 'Reopened',
  review_queue_duration: 'Time in Review Queue',
};

function formatDurationMinutes(min: number): string {
  if (!Number.isFinite(min) || min < 0) return '—';
  if (min < 60) return `${Math.round(min)}m`;
  if (min < 1440) {
    const h = Math.floor(min / 60);
    const m = Math.round(min - h * 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(min / 1440);
  const h = Math.floor((min - d * 1440) / 60);
  return `${d}d ${h}h`;
}


const ALERT_LABELS: Record<AlertType, string> = {
  short_notice: 'Short-Notice',
  oon: 'OON',
  confirmed_audit: 'Confirmed Audit',
  review_queue: 'Review Queue',
};

// Error Category options are stored in the qa_error_categories table (editable master list)

const RESOLUTION_TYPES = ['Resolved by QA', 'Escalated to Tech', 'Escalated to AM', 'Escalated to Gloria', 'Other'];

const VA_ASSIGNEES = [
  'Ivy Simeon',
  'Jenny',
  'Giselle Mitra',
  'Gloria Govender',
  'Matthew Pernes',
  'Robert Christian Tan',
  'Dean Lunderstedt',
  'Isis Curiel',
  'Aridni Martinez',
  'Marissa Kresnik',
  'Kathryn Meksavanh',
  'Alexa Briggs',
];
const TECH_ASSIGNEES = [
  'Luis De Leon',
  'Alexa Briggs',
  'Althea Romero',
  'Johann Paul Alpapara',
  'Mohsin',
];

const alertVariant = (t: AlertType): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (t === 'oon') return 'destructive';
  if (t === 'short_notice') return 'default';
  if (t === 'confirmed_audit') return 'outline';
  if (t === 'review_queue') return 'secondary';
  return 'secondary';
};

// ---------------------------------------------------------------------------
// Patient-level grouping. Every alert for the same GHL contact collapses into
// a single row; the newest alert wins for bucket placement and headline data.
// Rows without a ghl_contact_id fall back to project + normalized name + appt
// id so unrelated orphans don't merge together.
// ---------------------------------------------------------------------------
interface QAGroup {
  key: string;
  primary: QACase;
  children: QACase[];
  displayAlertTypes: AlertType[];
  earliestCreated: string;
  latestActivity: string;
  ticketCase: QACase | null;
}

const normalizeName = (n: string | null): string =>
  (n || '').trim().toLowerCase().replace(/\s+/g, ' ');

const groupKeyFor = (c: QACase): string => {
  if (c.ghl_contact_id) return `ghl:${c.ghl_contact_id}`;
  return `fallback:${c.project_name}|${normalizeName(c.patient_name)}|${c.appointment_id ?? c.id}`;
};

function groupCases(list: QACase[]): QAGroup[] {
  const buckets = new Map<string, QACase[]>();
  for (const c of list) {
    const key = groupKeyFor(c);
    const arr = buckets.get(key);
    if (arr) arr.push(c);
    else buckets.set(key, [c]);
  }
  const groups: QAGroup[] = [];
  for (const [key, children] of buckets) {
    const sorted = [...children].sort(
      (a, b) => new Date(b.last_alert_activity_at || b.entered_queue_at).getTime()
              - new Date(a.last_alert_activity_at || a.entered_queue_at).getTime(),
    );
    const primary = sorted[0];
    const latest = primary.alert_type;
    const hasOpenShortNotice = sorted.some(
      (c) => c.alert_type === 'short_notice' && c.workflow_status !== 'completed',
    );
    const displayAlertTypes: AlertType[] =
      latest === 'short_notice' || !hasOpenShortNotice
        ? [latest]
        : ['short_notice', latest];
    const earliestCreated = sorted
      .map((c) => c.first_entered_at || c.entered_queue_at)
      .sort()[0];
    const latestActivity = primary.last_alert_activity_at || primary.entered_queue_at;
    const ticketCase = sorted.find((c) => c.controlhub_ticket_id) || null;
    groups.push({ key, primary, children: sorted, displayAlertTypes, earliestCreated, latestActivity, ticketCase });
  }
  groups.sort(
    (a, b) => new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime(),
  );
  return groups;
}

export default function QAOperationsQueue() {
  const { user } = useAuth();
  const [tab, setTab] = useState<WorkflowStatus | 'all'>('new');
  const [cases, setCases] = useState<QACase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [alertFilter, setAlertFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedCase, setSelectedCase] = useState<QACase | null>(null);
  const [selectedSiblings, setSelectedSiblings] = useState<QACase[]>([]);
  
  

  const [projectLocationMap, setProjectLocationMap] = useState<Record<string, string>>({});
  const [errorSources, setErrorSources] = useState<{ id: string; name: string }[]>([]);
  const [errorCategories, setErrorCategories] = useState<{ id: string; name: string }[]>([]);

  const refreshErrorSources = async () => {
    const { data } = await supabase
      .from('qa_error_sources' as any)
      .select('id, name')
      .order('name', { ascending: true });
    setErrorSources(((data as any[]) || []).map((r) => ({ id: r.id, name: r.name })));
  };

  const refreshErrorCategories = async () => {
    const { data } = await supabase
      .from('qa_error_categories' as any)
      .select('id, name')
      .order('name', { ascending: true });
    setErrorCategories(((data as any[]) || []).map((r) => ({ id: r.id, name: r.name })));
  };

  const fetchCases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('qa_cases' as any)
      .select('*')
      .in('alert_type', ACTIVE_ALERT_TYPES)
      .order('entered_queue_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error('QA cases fetch error:', error);
      toast({ title: 'Failed to load cases', description: error.message, variant: 'destructive' });
      setCases([]);
    } else {
      setCases((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCases();
    const ch = supabase
      .channel('qa-cases-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qa_cases' }, () => {
        fetchCases();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);


  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select('project_name, ghl_location_id');
      if (data) {
        const map: Record<string, string> = {};
        for (const p of data as any[]) {
          if (p.ghl_location_id && p.project_name) map[p.project_name] = p.ghl_location_id;
        }
        setProjectLocationMap(map);
      }
    })();
    refreshErrorSources();
    refreshErrorCategories();
  }, []);

  const ghlUrlFor = (c: QACase): string | null => {
    if (!c.ghl_contact_id) return null;
    const loc = projectLocationMap[c.project_name];
    if (!loc) return null;
    return `https://app.gohighlevel.com/v2/location/${loc}/contacts/detail/${c.ghl_contact_id}`;
  };


  const projects = useMemo(() => Array.from(new Set(cases.map((c) => c.project_name))).sort(), [cases]);

  const hasActiveFilter = useMemo(() => (
    search.trim() !== '' ||
    projectFilter !== 'all' ||
    alertFilter !== 'all' ||
    assignmentFilter !== 'all' ||
    !!dateFrom || !!dateTo
  ), [search, projectFilter, alertFilter, assignmentFilter, dateFrom, dateTo]);

  // Apply everything except workflow_status. Used to derive per-bucket counts.
  const filteredNoStatus = useMemo(() => {
    const t = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (projectFilter !== 'all' && c.project_name !== projectFilter) return false;
      if (alertFilter !== 'all' && c.alert_type !== alertFilter) return false;
      if (assignmentFilter === 'mine' && c.assigned_qs_user_id !== user?.id) return false;
      if (assignmentFilter === 'unassigned' && c.assigned_qs_user_id) return false;
      if (dateFrom && new Date(c.entered_queue_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(c.entered_queue_at) > end) return false;
      }
      if (!t) return true;
      return (
        c.patient_name?.toLowerCase().includes(t) ||
        c.project_name.toLowerCase().includes(t) ||
        c.service_line?.toLowerCase().includes(t) ||
        c.error_source?.toLowerCase().includes(t) ||
        c.error_category?.toLowerCase().includes(t)
      );
    });
  }, [cases, search, projectFilter, alertFilter, assignmentFilter, dateFrom, dateTo, user?.id]);

  // Group filtered cases by patient (GHL contact w/ fallback). Bucket counts
  // and the visible table both work on groups so each patient appears once.
  const groupedNoStatus = useMemo(() => groupCases(filteredNoStatus), [filteredNoStatus]);

  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = { new: 0, in_review: 0, pending_escalated: 0, completed: 0, all: 0 };
    for (const g of groupedNoStatus) {
      const s = g.primary.workflow_status;
      if (counts[s] !== undefined) counts[s]++;
      counts.all++;
    }
    return counts;
  }, [groupedNoStatus]);

  const filteredGroups = useMemo(() => (
    tab === 'all' ? groupedNoStatus : groupedNoStatus.filter((g) => g.primary.workflow_status === tab)
  ), [groupedNoStatus, tab]);


  // When a search/filter is active and the current bucket has no matches, auto-switch
  // to the first bucket that does. Only reacts to filter changes, not manual tab clicks.
  useEffect(() => {
    if (!hasActiveFilter) return;
    if (tab === 'all') return;
    if (bucketCounts[tab] > 0) return;
    const order: WorkflowStatus[] = ['new', 'in_review', 'pending_escalated', 'completed'];
    const next = order.find((s) => bucketCounts[s] > 0);
    if (next && next !== tab) setTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveFilter, bucketCounts]);


  const updateStatus = async (id: string, next: WorkflowStatus) => {
    const patch: any = { workflow_status: next };
    if (next === 'in_review') patch.review_started_at = new Date().toISOString();
    if (next === 'completed') {
      patch.completed_at = new Date().toISOString();
      patch.completed_by_user_id = user?.id ?? null;
    }

    // Optimistic UI updates so the drawer + list reflect immediately
    const prevCases = cases;
    const prevSelected = selectedCase;
    const prevSiblings = selectedSiblings;
    setCases((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setSelectedCase((sc) => (sc && sc.id === id ? { ...sc, ...patch } : sc));
    setSelectedSiblings((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));

    const { error } = await supabase.from('qa_cases' as any).update(patch).eq('id', id);
    if (error) {
      // Revert optimistic changes
      setCases(prevCases);
      setSelectedCase(prevSelected);
      setSelectedSiblings(prevSiblings);
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('qa_case_activity' as any).insert({
      case_id: id,
      activity_type: 'status_change',
      description: `Status changed to ${next.replace('_', ' ')}`,
      actor_user_id: user?.id ?? null,
    } as any);
    toast({ title: 'Status updated' });
    fetchCases();

  };

  const openCase = (c: QACase, siblings: QACase[] = []) => {
    setSelectedSiblings(siblings.filter((s) => s.id !== c.id));
    if (c.workflow_status === 'new') {
      // Optimistically reflect In Review in the drawer immediately
      setSelectedCase({ ...c, workflow_status: 'in_review' });
      // Auto-transition in DB; do not await so modal opens instantly
      updateStatus(c.id, 'in_review');
    } else {
      setSelectedCase(c);
    }
  };

  const openGroup = (g: QAGroup) => openCase(g.primary, g.children);

  const switchToSibling = (c: QACase) => {
    // Switch within the same group without re-triggering the new→in_review flip
    const allInGroup = selectedCase
      ? [selectedCase, ...selectedSiblings]
      : [c];
    setSelectedSiblings(allInGroup.filter((s) => s.id !== c.id));
    setSelectedCase(c);
  };


  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">QA Operations Queue</h2>
          <p className="text-sm text-muted-foreground">
            Centralized workspace for reviewing appointment quality alerts and auditing confirmed appointments.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search patient, project, service, error…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={alertFilter} onValueChange={setAlertFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Alert type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All alert types</SelectItem>
            <SelectItem value="review_queue">Review Queue</SelectItem>
            <SelectItem value="confirmed_audit">Confirmed Audit</SelectItem>
            <SelectItem value="short_notice">Short-Notice</SelectItem>
            <SelectItem value="oon">OON</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Assignment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignments</SelectItem>
            <SelectItem value="mine">Assigned to me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('justify-start', !dateFrom && 'text-muted-foreground')}>
              <CalendarIcon className="h-3 w-3 mr-1" />
              {dateFrom ? format(dateFrom, 'MMM d') : 'From'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn('p-3 pointer-events-auto')} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('justify-start', !dateTo && 'text-muted-foreground')}>
              <CalendarIcon className="h-3 w-3 mr-1" />
              {dateTo ? format(dateTo, 'MMM d') : 'To'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn('p-3 pointer-events-auto')} />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={clearDateFilters}>Clear dates</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              <Badge
                variant={hasActiveFilter && bucketCounts[t.value] > 0 ? 'default' : 'secondary'}
                className="ml-2"
              >
                {bucketCounts[t.value] ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="border rounded-lg overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No cases in this view.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Alerts</TableHead>
                    <TableHead>Self-Booked</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Error Source</TableHead>
                    <TableHead>Resolution</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Latest Alert</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((g) => {
                    const c = g.primary;
                    const ticket = g.ticketCase;
                    return (
                    <TableRow key={g.key} className="cursor-pointer" onClick={() => openGroup(g)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{c.patient_name || '—'}</span>
                          {ghlUrlFor(c) && (
                            <a
                              href={ghlUrlFor(c)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:text-primary/80"
                              title="Open in GHL"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{c.project_name}</TableCell>
                      <TableCell>{c.service_line || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {g.displayAlertTypes.map((t) => (
                            <Badge key={t} variant={alertVariant(t)}>{ALERT_LABELS[t]}</Badge>
                          ))}
                          {g.children.length > g.displayAlertTypes.length && (
                            <Badge variant="outline" title="Older alerts moved to history">
                              +{g.children.length - g.displayAlertTypes.length}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{c.self_booked === null ? '—' : c.self_booked ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{c.error_category || '—'}</TableCell>
                      <TableCell>{c.error_source || '—'}</TableCell>
                      <TableCell>{c.resolution_type || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(g.earliestCreated), 'MMM d, h:mm a')}</TableCell>
                      <TableCell>{format(new Date(g.latestActivity), 'MMM d, h:mm a')}</TableCell>
                      <TableCell>{c.date_resolved ? format(new Date(c.date_resolved), 'MMM d') : '—'}</TableCell>
                      <TableCell>
                        {ticket?.controlhub_ticket_id ? (
                          <a
                            href={ticket.controlhub_ticket_url ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {ticket.controlhub_ticket_id} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openGroup(g); }}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

          </div>
        </TabsContent>
      </Tabs>

      <CaseDrawer
        caseData={selectedCase}
        siblings={selectedSiblings}
        onSwitchCase={switchToSibling}
        ghlUrl={selectedCase ? ghlUrlFor(selectedCase) : null}
        errorSources={errorSources}
        onErrorSourcesRefresh={refreshErrorSources}
        errorCategories={errorCategories}
        onErrorCategoriesRefresh={refreshErrorCategories}
        onClose={() => { setSelectedCase(null); setSelectedSiblings([]); }}
        onStatusChange={updateStatus}
        onRefresh={() => { fetchCases(); }}
      />


    </div>
  );
}

function CaseDrawer({
  caseData,
  siblings,
  onSwitchCase,
  ghlUrl,
  errorSources,
  onErrorSourcesRefresh,
  errorCategories,
  onErrorCategoriesRefresh,
  onClose,
  onStatusChange,
  onRefresh,
}: {
  caseData: QACase | null;
  siblings: QACase[];
  onSwitchCase: (c: QACase) => void;
  ghlUrl: string | null;
  errorSources: { id: string; name: string }[];
  onErrorSourcesRefresh: () => Promise<void>;
  errorCategories: { id: string; name: string }[];
  onErrorCategoriesRefresh: () => Promise<void>;
  onClose: () => void;
  onStatusChange: (id: string, next: WorkflowStatus) => Promise<void>;
  onRefresh: () => void;
}) {

  const { user } = useAuth();
  const [notes, setNotes] = useState<QANote[]>([]);
  const [activity, setActivity] = useState<QAActivity[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [audit, setAudit] = useState<Partial<QACase>>({});
  const [savingAudit, setSavingAudit] = useState(false);
  const [portalRecord, setPortalRecord] = useState<any | null>(null);
  const [loadingPortalRecord, setLoadingPortalRecord] = useState(false);
  const [authorDisplayName, setAuthorDisplayName] = useState<string>('');

  const openPortalRecord = async () => {
    if (!caseData?.appointment_id) return;
    setLoadingPortalRecord(true);
    const { data, error } = await supabase
      .from('all_appointments')
      .select('*')
      .eq('id', caseData.appointment_id)
      .single();
    setLoadingPortalRecord(false);
    if (error || !data) {
      toast({ title: 'Unable to load record', description: error?.message || 'Not found', variant: 'destructive' });
      return;
    }
    setPortalRecord(data);
  };

  const refreshPortalRecord = async () => {
    if (!portalRecord?.id) return;
    const { data } = await supabase.from('all_appointments').select('*').eq('id', portalRecord.id).single();
    if (data) setPortalRecord(data);
    onRefresh();
  };

  useEffect(() => {
    if (!caseData) return;
    (async () => {
      let defaultName = '';
      if (user?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .maybeSingle();
        defaultName = ((prof as any)?.full_name || '').trim() || (user as any)?.user_metadata?.full_name || '';
      }
      setAuthorDisplayName(defaultName || user?.email || '');
      setAudit({
        qa_name: caseData.qa_name ?? (defaultName || ''),
        self_booked: caseData.self_booked,
        error_category: caseData.error_category,
        error_source: caseData.error_source,
        caught_before_clinic: caseData.caught_before_clinic,
        resolution_type: caseData.resolution_type,
      });
    })();
    (async () => {
      const [n, a] = await Promise.all([
        supabase.from('qa_case_notes' as any).select('*').eq('case_id', caseData.id).order('created_at', { ascending: false }),
        supabase.from('qa_case_activity' as any).select('*').eq('case_id', caseData.id).order('created_at', { ascending: false }),
      ]);
      setNotes(((n.data as any) || []) as QANote[]);
      setActivity(((a.data as any) || []) as QAActivity[]);
    })();
  }, [caseData, user?.email]);

  const addNote = async () => {
    if (!caseData || !noteDraft.trim()) return;
    const { error } = await supabase.from('qa_case_notes' as any).insert({
      case_id: caseData.id,
      note: noteDraft.trim(),
      author_user_id: user?.id ?? null,
      author_name: authorDisplayName || user?.email || null,
    } as any);
    if (error) {
      toast({ title: 'Failed to add note', description: error.message, variant: 'destructive' });
      return;
    }
    setNoteDraft('');
    const { data } = await supabase.from('qa_case_notes' as any).select('*').eq('case_id', caseData.id).order('created_at', { ascending: false });
    setNotes(((data as any) || []) as QANote[]);
  };

  const saveAudit = async () => {
    if (!caseData) return;
    setSavingAudit(true);
    const patch: any = {
      qa_name: audit.qa_name ?? null,
      self_booked: audit.self_booked ?? null,
      error_category: audit.error_category ?? null,
      error_source: audit.error_source ?? null,
      caught_before_clinic: audit.caught_before_clinic ?? null,
      resolution_type: audit.resolution_type ?? null,
    };
    if (!caseData.assigned_qs_user_id && user?.id) {
      patch.assigned_qs_user_id = user.id;
    }
    const { error } = await supabase.from('qa_cases' as any).update(patch).eq('id', caseData.id);
    setSavingAudit(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('qa_case_activity' as any).insert({
      case_id: caseData.id,
      activity_type: 'audit_update',
      description: 'Audit fields updated',
      actor_user_id: user?.id ?? null,
    } as any);
    toast({ title: 'Audit details saved' });
    onRefresh();
  };

  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    task_name: '',
    client_name: '',
    service_involved: '',
    issue_type: '' as '' | 'va' | 'tech',
    priority: 'medium',
    description: '',
    submitted_by: '',
    assignee_names: [] as string[],
  });
  const [assigneeSearch, setAssigneeSearch] = useState('');

  const stripTypePrefix = (name: string) =>
    name.replace(/^QA:\s+[^—]+\s—\s/, '').replace(/^(VA|Tech)\s+(Ticket\s+)?—\s*/, '');
  const applyTypePrefix = (name: string, type: '' | 'va' | 'tech') => {
    const base = stripTypePrefix(name);
    if (type === 'va') return `VA Ticket — ${base}`;
    if (type === 'tech') return `Tech Ticket — ${base}`;
    return base;
  };

  const buildDefaultDescription = (c: QACase): string => {
    const apptLine = c.appointment_date
      ? `Appointment: ${format(new Date(c.appointment_date), 'PP p')}`
      : 'Appointment: Not scheduled';
    const lines = [
      `Patient: ${c.patient_name || 'Unknown'}`,
      `Service line: ${c.service_line || 'n/a'}`,
      apptLine,
    ];
    if (ghlUrl) lines.push(`GHL: ${ghlUrl}`);
    return lines.join('\n');
  };

  const openTicketDialog = async () => {
    if (!caseData) return;
    let submittedBy = user?.email ?? '';
    if (user?.id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();
      submittedBy = ((prof as any)?.full_name || '').trim() || (prof as any)?.email || user?.email || '';
    }
    setTicketForm({
      task_name: '',
      client_name: caseData.project_name || '',
      service_involved: caseData.service_line || '',
      issue_type: '',
      priority: 'medium',
      description: buildDefaultDescription(caseData),
      submitted_by: submittedBy,
      assignee_names: [],
    });
    setTicketDialogOpen(true);
  };

  const submitTicket = async () => {
    if (!caseData) return;
    if (!ticketForm.task_name.trim() || !ticketForm.client_name.trim() || !ticketForm.description.trim()) {
      toast({ title: 'Missing required fields', description: 'Task name, client, and description are required.', variant: 'destructive' });
      return;
    }
    if (ticketForm.issue_type !== 'va' && ticketForm.issue_type !== 'tech') {
      toast({ title: 'Ticket type required', description: 'Select VA Ticket or Tech Ticket.', variant: 'destructive' });
      return;
    }
    setCreatingTicket(true);
    const { data, error } = await supabase.functions.invoke('create-controlhub-ticket', {
      body: {
        case_id: caseData.id,
        task_name: ticketForm.task_name.trim(),
        client_name: ticketForm.client_name.trim(),
        service_involved: ticketForm.service_involved.trim() || null,
        issue_type: ticketForm.issue_type,
        priority: ticketForm.priority,
        description: ticketForm.description.trim(),
        submitted_by: ticketForm.submitted_by.trim() || 'PatientPro QA Queue',
        submitted_by_email: user?.email ?? null,
        assignee_names: ticketForm.assignee_names,
        assignee_name: ticketForm.assignee_names[0] || null,
      },
    });
    setCreatingTicket(false);
    if (error) {
      toast({ title: 'Ticket creation failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'ControlHub ticket created', description: (data as any)?.ticket_id });
    setTicketDialogOpen(false);
    onRefresh();
  };


  return (
    <Sheet open={!!caseData} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl min-w-0 overflow-y-auto overflow-x-hidden">
        {caseData && (
          <>
            <SheetHeader className="min-w-0 pr-6">
              <SheetTitle className="break-words">{caseData.patient_name || 'Unnamed patient'}</SheetTitle>
              <div className="text-sm text-muted-foreground break-words">
                {caseData.project_name} • {caseData.service_line || 'No service'}
              </div>
            </SheetHeader>

            {siblings.length > 0 && (() => {
              const pinnedShortNotice =
                caseData.alert_type !== 'short_notice'
                  ? siblings.find(
                      (s) => s.alert_type === 'short_notice' && s.workflow_status !== 'completed',
                    )
                  : undefined;
              const previousAlerts = siblings.filter((s) => s.id !== pinnedShortNotice?.id);
              return (
                <div className="mt-3 border rounded-lg p-3 bg-muted/30 space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Current alert{pinnedShortNotice ? 's' : ''} for this patient
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={alertVariant(caseData.alert_type)} className="cursor-default">
                        {ALERT_LABELS[caseData.alert_type]} · {caseData.workflow_status.replace('_', ' ')}
                      </Badge>
                      {pinnedShortNotice && (
                        <button
                          onClick={() => onSwitchCase(pinnedShortNotice)}
                          className="inline-flex"
                          title={`Open ${ALERT_LABELS[pinnedShortNotice.alert_type]} alert`}
                        >
                          <Badge variant={alertVariant(pinnedShortNotice.alert_type)} className="cursor-pointer hover:opacity-80">
                            {ALERT_LABELS[pinnedShortNotice.alert_type]} · {pinnedShortNotice.workflow_status.replace('_', ' ')}
                          </Badge>
                        </button>
                      )}
                    </div>
                  </div>
                  {previousAlerts.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Previous alerts ({previousAlerts.length}) — click to switch
                      </div>
                      <div className="flex flex-col gap-1">
                        {previousAlerts.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => onSwitchCase(s)}
                            className="text-left text-xs px-2 py-1 rounded hover:bg-accent flex items-center justify-between gap-2"
                            title={`Open ${ALERT_LABELS[s.alert_type]} alert`}
                          >
                            <span>
                              <Badge variant="outline" className="mr-2">{ALERT_LABELS[s.alert_type]}</Badge>
                              <span className="text-muted-foreground">{s.workflow_status.replace('_', ' ')}</span>
                            </span>
                            <span className="text-muted-foreground">
                              {format(new Date(s.last_alert_activity_at || s.entered_queue_at), 'MMM d, h:mm a')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}


            <div className="space-y-4 mt-4 min-w-0 max-w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm min-w-0">
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs">Alert</div>
                  <Badge variant={alertVariant(caseData.alert_type)}>{ALERT_LABELS[caseData.alert_type]}</Badge>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs">Appt status</div>
                  <div className="break-words">{caseData.appointment_status || '—'}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs">Appt date</div>
                  <div className="break-words">{caseData.appointment_date ? format(new Date(caseData.appointment_date), 'PP p') : '—'}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs">Date created</div>
                  <div className="break-words">{format(new Date(caseData.first_entered_at || caseData.entered_queue_at), 'PP p')}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs">Latest alert</div>
                  <div className="break-words">{format(new Date(caseData.entered_queue_at), 'PP p')}</div>
                </div>
                {caseData.date_resolved && (
                  <div className="min-w-0">
                    <div className="text-muted-foreground text-xs">Date resolved</div>
                    <div className="break-words">{format(new Date(caseData.date_resolved), 'PP p')}</div>
                  </div>
                )}
              </div>

              {caseData.review_entered_at && (
                <div className="border rounded-lg p-3 space-y-1 bg-muted/30 min-w-0 overflow-hidden">
                  <div className="text-sm font-semibold">Review Queue Timeline</div>
                  <div className="text-xs text-muted-foreground">
                    Entered: {format(new Date(caseData.review_entered_at), 'PP p')}
                  </div>
                  {caseData.review_resolved_at ? (
                    <>
                      <div className="text-xs text-muted-foreground">
                        Resolved: {format(new Date(caseData.review_resolved_at), 'PP p')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Time in queue: {(() => {
                          const ms = new Date(caseData.review_resolved_at).getTime() - new Date(caseData.review_entered_at).getTime();
                          const mins = Math.max(0, Math.round(ms / 60000));
                          if (mins < 60) return `${mins} min`;
                          const hrs = Math.floor(mins / 60);
                          const rem = mins % 60;
                          if (hrs < 24) return `${hrs}h ${rem}m`;
                          const days = Math.floor(hrs / 24);
                          return `${days}d ${hrs % 24}h`;
                        })()}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-amber-600">Awaiting review action</div>
                  )}
                </div>
              )}


              <div>
                <div className="text-xs text-muted-foreground mb-1">Workflow status</div>
                <Select value={caseData.workflow_status} onValueChange={(v) => onStatusChange(caseData.id, v as WorkflowStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="pending_escalated">Pending / Escalated</SelectItem>
                    <SelectItem value="reopened">Reopened</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg p-3 space-y-3 min-w-0 overflow-hidden">
                <div className="text-sm font-semibold">Audit Details</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <div className="min-w-0">
                    <Label className="text-xs">QA Name</Label>
                    <Input
                      value={audit.qa_name ?? ''}
                      onChange={(e) => setAudit((a) => ({ ...a, qa_name: e.target.value }))}
                      placeholder="QA specialist"
                    />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-xs">Error Source</Label>
                    <ErrorSourceField
                      value={audit.error_source ?? ''}
                      onChange={(v) => setAudit((a) => ({ ...a, error_source: v }))}
                      sources={errorSources}
                      onSourcesRefresh={onErrorSourcesRefresh}
                    />
                  </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <div className="min-w-0">
                    <Label className="text-xs">Error Category</Label>
                    <ErrorCategoryField
                      value={audit.error_category ?? ''}
                      onChange={(v) => setAudit((a) => ({ ...a, error_category: v }))}
                      categories={errorCategories}
                      onCategoriesRefresh={onErrorCategoriesRefresh}
                    />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-xs">Resolution Type</Label>
                    <Select
                      value={audit.resolution_type ?? ''}
                      onValueChange={(v) => setAudit((a) => ({ ...a, resolution_type: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {RESOLUTION_TYPES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!audit.self_booked}
                      onCheckedChange={(v) => setAudit((a) => ({ ...a, self_booked: v }))}
                    />
                    <Label className="text-xs">Self-booked</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!audit.caught_before_clinic}
                      onCheckedChange={(v) => setAudit((a) => ({ ...a, caught_before_clinic: v }))}
                    />
                    <Label className="text-xs">Caught before clinic</Label>
                  </div>
                </div>

                <div className="min-w-0">
                  <Label className="text-xs">GHL Contact</Label>
                  <div>
                    {ghlUrl ? (
                      <a
                        href={ghlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        Open in GHL <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No GHL contact linked</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={saveAudit} disabled={savingAudit}>
                    {savingAudit ? 'Saving…' : 'Save audit details'}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {caseData.appointment_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openPortalRecord}
                    disabled={loadingPortalRecord}
                  >
                    {loadingPortalRecord ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Maximize2 className="h-3 w-3 mr-1" />
                    )}
                    View patient record
                  </Button>
                )}
                {!caseData.controlhub_ticket_id && (
                  <Button size="sm" onClick={openTicketDialog} disabled={creatingTicket}>
                    <Ticket className="h-3 w-3 mr-1" />
                    Create ControlHub Ticket
                  </Button>
                )}
                {caseData.controlhub_ticket_id && (
                  <a href={caseData.controlhub_ticket_url ?? '#'} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      Ticket {caseData.controlhub_ticket_id} <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </a>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Notes</div>
                <Textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add an internal QA note…"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={addNote} disabled={!noteDraft.trim()}>Add note</Button>
                </div>
                <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
                  {notes.map((n) => (
                    <div key={n.id} className="border rounded p-2 text-sm">
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>{n.author_name || 'Unknown'}</span>
                        <span>{format(new Date(n.created_at), 'MMM d, h:mm a')}</span>
                      </div>
                      <div className="whitespace-pre-wrap break-words">{renderWithLinks(n.note)}</div>
                    </div>
                  ))}
                  {notes.length === 0 && <div className="text-xs text-muted-foreground">No notes yet.</div>}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Activity</div>
                <div className="space-y-1 max-h-64 overflow-y-auto text-sm">
                  {[...activity].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((a) => {
                    const meta = (a.metadata || {}) as any;
                    const isDuration = a.activity_type === 'review_queue_duration';
                    const isRQTransition = a.activity_type === 'status_change' && meta.from_alert === 'review_queue';
                    const durationText = isDuration && typeof meta.duration_minutes === 'number'
                      ? formatDurationMinutes(meta.duration_minutes)
                      : null;
                    return (
                          <div key={a.id} className="border-b py-1.5 min-w-0">
                        <div className="flex justify-between gap-2 min-w-0">
                          <span className="flex items-start gap-1.5 min-w-0">
                            {isDuration && <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />}
                            <span className="min-w-0 break-words">
                              {a.description || ACTIVITY_LABELS[a.activity_type] || a.activity_type}
                              {durationText && !a.description?.includes(durationText) && (
                                <span className="ml-1 font-medium">{durationText}</span>
                              )}
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">{format(new Date(a.created_at), 'MMM d, h:mm a')}</span>
                        </div>
                        {isRQTransition && (meta.actor_name || meta.to_alert || meta.resolution) && (
                          <div className="text-xs text-muted-foreground mt-0.5 ml-0.5 flex flex-wrap gap-1.5 items-center">
                            {meta.actor_name && <span>by {meta.actor_name}</span>}
                            {meta.to_alert && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Review Queue → {ALERT_LABELS[meta.to_alert as AlertType] || meta.to_alert}
                              </Badge>
                            )}
                            {meta.resolution && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                {meta.resolution}
                              </Badge>
                            )}
                            {meta.duplicate_of && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Duplicate of {ALERT_LABELS[meta.duplicate_of as AlertType] || meta.duplicate_of}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {activity.length === 0 && <div className="text-xs text-muted-foreground">No activity yet.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create ControlHub Ticket</DialogTitle>
            <DialogDescription>
              Log a ticket without leaving the portal. Fields are prefilled from the QA case — edit as needed before submitting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Task name *</Label>
              <Input
                value={ticketForm.task_name}
                onChange={(e) => setTicketForm((f) => ({ ...f, task_name: e.target.value }))}
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Client *</Label>
                <Input
                  value={ticketForm.client_name}
                  onChange={(e) => setTicketForm((f) => ({ ...f, client_name: e.target.value }))}
                  maxLength={120}
                />
              </div>
              <div>
                <Label className="text-xs">Service involved</Label>
                <Input
                  value={ticketForm.service_involved}
                  onChange={(e) => setTicketForm((f) => ({ ...f, service_involved: e.target.value }))}
                  maxLength={120}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ticket type *</Label>
                <Select
                  value={ticketForm.issue_type || undefined}
                  onValueChange={(v) => setTicketForm((f) => ({
                    ...f,
                    issue_type: v as 'va' | 'tech',
                    task_name: f.task_name.trim() ? applyTypePrefix(f.task_name, v as 'va' | 'tech') : f.task_name,
                    assignee_names: [],
                  }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select ticket type…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="va">VA Ticket</SelectItem>
                    <SelectItem value="tech">Tech Ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(v) => setTicketForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Assignees (optional)</Label>
              <Popover
                onOpenChange={(open) => { if (!open) setAssigneeSearch(''); }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal h-auto min-h-10 py-2"
                    disabled={!ticketForm.issue_type}
                  >
                    {ticketForm.assignee_names.length === 0 ? (
                      <span className="text-muted-foreground">
                        {ticketForm.issue_type ? 'Unassigned — click to add…' : 'Select ticket type first…'}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {ticketForm.assignee_names.map((name) => (
                          <Badge
                            key={name}
                            variant="secondary"
                            className="gap-1"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setTicketForm((f) => ({
                                ...f,
                                assignee_names: f.assignee_names.filter((n) => n !== name),
                              }));
                            }}
                          >
                            {name} <span className="ml-1 text-muted-foreground">×</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
                  <Input
                    autoFocus
                    placeholder="Search assignees…"
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    className="mb-2 h-8"
                  />
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {(ticketForm.issue_type === 'tech' ? TECH_ASSIGNEES : VA_ASSIGNEES)
                      .filter((name) => name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                      .map((name) => {
                        const checked = ticketForm.assignee_names.includes(name);
                        return (
                          <label
                            key={name}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setTicketForm((f) => ({
                                  ...f,
                                  assignee_names: e.target.checked
                                    ? [...f.assignee_names, name]
                                    : f.assignee_names.filter((n) => n !== name),
                                }));
                              }}
                            />
                            {name}
                          </label>
                        );
                      })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-xs">Description *</Label>
              <Textarea
                value={ticketForm.description}
                onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))}
                rows={6}
                maxLength={4000}
              />
            </div>

            <div>
              <Label className="text-xs">Submitted by</Label>
              <Input value={ticketForm.submitted_by} readOnly className="bg-muted" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTicketDialogOpen(false)} disabled={creatingTicket}>
              Cancel
            </Button>
            <Button onClick={submitTicket} disabled={creatingTicket || !ticketForm.issue_type || !ticketForm.task_name.trim()}>
              {creatingTicket && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {creatingTicket ? 'Creating…' : 'Create ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {portalRecord && (
        <DetailedAppointmentView
          appointment={portalRecord}
          isOpen={!!portalRecord}
          onClose={() => setPortalRecord(null)}
          onDataRefresh={refreshPortalRecord}
          onDeleted={() => { setPortalRecord(null); onRefresh(); }}
        />
      )}
    </Sheet>
  );
}

function ErrorSourceField({
  value,
  onChange,
  sources,
  onSourcesRefresh,
}: {
  value: string;
  onChange: (v: string) => void;
  sources: { id: string; name: string }[];
  onSourcesRefresh: () => Promise<void>;
}) {
  const [showOther, setShowOther] = useState(false);
  const [otherInput, setOtherInput] = useState('');
  const [otherError, setOtherError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inList = value && sources.some((s) => s.name === value);
  const selectValue = inList ? value : showOther || value ? '__other__' : '';

  const handleAdd = async () => {
    const trimmed = otherInput.trim();
    setOtherError(null);
    if (!trimmed) {
      setOtherError('Please enter a name.');
      return;
    }
    const existing = sources.find(
      (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setOtherError(`"${existing.name}" already exists in the list — please select it instead.`);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('qa_error_sources' as any)
      .insert({ name: trimmed });
    setSaving(false);
    if (error) {
      if ((error as any).code === '23505') {
        setOtherError(`"${trimmed}" already exists in the list — please select it instead.`);
        await onSourcesRefresh();
      } else {
        setOtherError(error.message);
      }
      return;
    }
    await onSourcesRefresh();
    onChange(trimmed);
    setOtherInput('');
    setShowOther(false);
  };

  return (
    <>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === '__other__') {
            setShowOther(true);
            setOtherError(null);
            onChange('');
          } else {
            setShowOther(false);
            setOtherError(null);
            onChange(v);
          }
        }}
      >
        <SelectTrigger><SelectValue placeholder="Select error source" /></SelectTrigger>
        <SelectContent className="max-h-72">
          {sources.map((s) => (
            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
          ))}
          <SelectItem value="__other__">Other…</SelectItem>
        </SelectContent>
      </Select>
      {showOther && (
        <div className="mt-2 space-y-1">
          <div className="flex gap-2">
            <Input
              value={otherInput}
              onChange={(e) => { setOtherInput(e.target.value); setOtherError(null); }}
              placeholder="Enter new error source"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <Button type="button" onClick={handleAdd} disabled={saving} size="sm">
              {saving ? 'Adding…' : 'Add'}
            </Button>
          </div>
          {otherError && (
            <p className="text-xs text-destructive">{otherError}</p>
          )}
        </div>
      )}
    </>
  );
}

function ErrorCategoryField({
  value,
  onChange,
  categories,
  onCategoriesRefresh,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: { id: string; name: string }[];
  onCategoriesRefresh: () => Promise<void>;
}) {
  const [showOther, setShowOther] = useState(false);
  const [otherInput, setOtherInput] = useState('');
  const [otherError, setOtherError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inList = value && categories.some((c) => c.name === value);
  const selectValue = inList ? value : showOther || value ? '__other__' : '';

  const handleAdd = async () => {
    const trimmed = otherInput.trim();
    setOtherError(null);
    if (!trimmed) {
      setOtherError('Please enter a category.');
      return;
    }
    const existing = categories.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setOtherError(`"${existing.name}" already exists in the list — please select it instead.`);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('qa_error_categories' as any)
      .insert({ name: trimmed });
    setSaving(false);
    if (error) {
      if ((error as any).code === '23505') {
        setOtherError(`"${trimmed}" already exists in the list — please select it instead.`);
        await onCategoriesRefresh();
      } else {
        setOtherError(error.message);
      }
      return;
    }
    await onCategoriesRefresh();
    onChange(trimmed);
    setOtherInput('');
    setShowOther(false);
  };

  return (
    <>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === '__other__') {
            setShowOther(true);
            setOtherError(null);
            onChange('');
          } else {
            setShowOther(false);
            setOtherError(null);
            onChange(v);
          }
        }}
      >
        <SelectTrigger><SelectValue placeholder="Select error category" /></SelectTrigger>
        <SelectContent className="max-h-72">
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
          ))}
          <SelectItem value="__other__">Other…</SelectItem>
        </SelectContent>
      </Select>
      {showOther && (
        <div className="mt-2 space-y-1">
          <div className="flex gap-2">
            <Input
              value={otherInput}
              onChange={(e) => { setOtherInput(e.target.value); setOtherError(null); }}
              placeholder="Enter new error category"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <Button type="button" onClick={handleAdd} disabled={saving} size="sm">
              {saving ? 'Adding…' : 'Add'}
            </Button>
          </div>
          {otherError && (
            <p className="text-xs text-destructive">{otherError}</p>
          )}
        </div>
      )}
    </>
  );
}
