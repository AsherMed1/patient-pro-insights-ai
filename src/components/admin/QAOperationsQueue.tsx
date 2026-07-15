import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Loader2, ExternalLink, Ticket } from 'lucide-react';

type WorkflowStatus = 'new' | 'in_review' | 'pending_escalated' | 'completed' | 'reopened';

interface QACase {
  id: string;
  appointment_id: string | null;
  ghl_contact_id: string | null;
  project_name: string;
  patient_name: string | null;
  service_line: string | null;
  appointment_date: string | null;
  appointment_status: string | null;
  alert_type: 'short_notice' | 'oon' | 'cancelled' | 'no_show';
  workflow_status: WorkflowStatus;
  entered_queue_at: string;
  last_alert_activity_at: string;
  completed_at: string | null;
  controlhub_ticket_id: string | null;
  controlhub_ticket_url: string | null;
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
  { value: 'reopened', label: 'Reopened' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
];

const ALERT_LABELS: Record<QACase['alert_type'], string> = {
  short_notice: 'Short-Notice',
  oon: 'OON',
  cancelled: 'Cancelled (was Confirmed)',
  no_show: 'No Show (was Confirmed)',
};

const alertVariant = (t: QACase['alert_type']): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (t === 'oon') return 'destructive';
  if (t === 'short_notice') return 'default';
  return 'secondary';
};

export default function QAOperationsQueue() {
  const { user } = useAuth();
  const [tab, setTab] = useState<WorkflowStatus | 'all'>('new');
  const [cases, setCases] = useState<QACase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [alertFilter, setAlertFilter] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<QACase | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchCases = async () => {
    setLoading(true);
    let q = supabase
      .from('qa_cases' as any)
      .select('*')
      .order('entered_queue_at', { ascending: false })
      .limit(500);
    if (tab !== 'all') q = q.eq('workflow_status', tab);
    const { data, error } = await q;
    if (error) {
      console.error('QA cases fetch error:', error);
      toast({ title: 'Failed to load cases', description: error.message, variant: 'destructive' });
      setCases([]);
    } else {
      setCases((data as any) || []);
    }
    setLoading(false);
  };

  const fetchCounts = async () => {
    const results = await Promise.all(
      (['new', 'in_review', 'pending_escalated', 'reopened', 'completed'] as WorkflowStatus[]).map(async (s) => {
        const { count } = await supabase
          .from('qa_cases' as any)
          .select('id', { count: 'exact', head: true })
          .eq('workflow_status', s);
        return [s, count || 0] as const;
      })
    );
    setCounts(Object.fromEntries(results));
  };

  useEffect(() => {
    fetchCases();
    fetchCounts();
    const ch = supabase
      .channel('qa-cases-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qa_cases' }, () => {
        fetchCases();
        fetchCounts();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const projects = useMemo(() => Array.from(new Set(cases.map((c) => c.project_name))).sort(), [cases]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (projectFilter !== 'all' && c.project_name !== projectFilter) return false;
      if (alertFilter !== 'all' && c.alert_type !== alertFilter) return false;
      if (!t) return true;
      return (
        c.patient_name?.toLowerCase().includes(t) ||
        c.project_name.toLowerCase().includes(t) ||
        c.service_line?.toLowerCase().includes(t)
      );
    });
  }, [cases, search, projectFilter, alertFilter]);

  const updateStatus = async (id: string, next: WorkflowStatus) => {
    const patch: any = { workflow_status: next };
    if (next === 'in_review') patch.review_started_at = new Date().toISOString();
    if (next === 'completed') {
      patch.completed_at = new Date().toISOString();
      patch.completed_by_user_id = user?.id ?? null;
    }
    const { error } = await supabase.from('qa_cases' as any).update(patch).eq('id', id);
    if (error) {
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
    fetchCounts();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">QA Operations Queue</h2>
          <p className="text-sm text-muted-foreground">
            Centralized workspace for reviewing appointment quality alerts.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search patient, project, service…"
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
            <SelectItem value="short_notice">Short-Notice</SelectItem>
            <SelectItem value="oon">OON</SelectItem>
            <SelectItem value="cancelled">Cancelled (was Confirmed)</SelectItem>
            <SelectItem value="no_show">No Show (was Confirmed)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              {t.value !== 'all' && counts[t.value] > 0 && (
                <Badge variant="secondary" className="ml-2">{counts[t.value]}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="border rounded-lg overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No cases in this view.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Alert</TableHead>
                    <TableHead>Appt Status</TableHead>
                    <TableHead>Entered Queue</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelectedCase(c)}>
                      <TableCell className="font-medium">{c.patient_name || '—'}</TableCell>
                      <TableCell>{c.project_name}</TableCell>
                      <TableCell>{c.service_line || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={alertVariant(c.alert_type)}>{ALERT_LABELS[c.alert_type]}</Badge>
                      </TableCell>
                      <TableCell>{c.appointment_status || '—'}</TableCell>
                      <TableCell>{format(new Date(c.entered_queue_at), 'MMM d, h:mm a')}</TableCell>
                      <TableCell>
                        {c.controlhub_ticket_id ? (
                          <a
                            href={c.controlhub_ticket_url ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.controlhub_ticket_id} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedCase(c); }}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CaseDrawer
        caseData={selectedCase}
        onClose={() => setSelectedCase(null)}
        onStatusChange={updateStatus}
        onRefresh={() => { fetchCases(); fetchCounts(); }}
      />
    </div>
  );
}

function CaseDrawer({
  caseData,
  onClose,
  onStatusChange,
  onRefresh,
}: {
  caseData: QACase | null;
  onClose: () => void;
  onStatusChange: (id: string, next: WorkflowStatus) => Promise<void>;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<QANote[]>([]);
  const [activity, setActivity] = useState<QAActivity[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  useEffect(() => {
    if (!caseData) return;
    (async () => {
      const [n, a] = await Promise.all([
        supabase.from('qa_case_notes' as any).select('*').eq('case_id', caseData.id).order('created_at', { ascending: false }),
        supabase.from('qa_case_activity' as any).select('*').eq('case_id', caseData.id).order('created_at', { ascending: false }),
      ]);
      setNotes(((n.data as any) || []) as QANote[]);
      setActivity(((a.data as any) || []) as QAActivity[]);
    })();
  }, [caseData]);

  const addNote = async () => {
    if (!caseData || !noteDraft.trim()) return;
    const { error } = await supabase.from('qa_case_notes' as any).insert({
      case_id: caseData.id,
      note: noteDraft.trim(),
      author_user_id: user?.id ?? null,
      author_name: user?.email ?? null,
    } as any);
    if (error) {
      toast({ title: 'Failed to add note', description: error.message, variant: 'destructive' });
      return;
    }
    setNoteDraft('');
    const { data } = await supabase.from('qa_case_notes' as any).select('*').eq('case_id', caseData.id).order('created_at', { ascending: false });
    setNotes(((data as any) || []) as QANote[]);
  };

  const createTicket = async () => {
    if (!caseData) return;
    setCreatingTicket(true);
    const { data, error } = await supabase.functions.invoke('create-controlhub-ticket', {
      body: { case_id: caseData.id },
    });
    setCreatingTicket(false);
    if (error) {
      toast({ title: 'Ticket creation failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'ControlHub ticket created', description: (data as any)?.ticket_id });
    onRefresh();
  };

  return (
    <Sheet open={!!caseData} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {caseData && (
          <>
            <SheetHeader>
              <SheetTitle>{caseData.patient_name || 'Unnamed patient'}</SheetTitle>
              <div className="text-sm text-muted-foreground">
                {caseData.project_name} • {caseData.service_line || 'No service'}
              </div>
            </SheetHeader>

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Alert</div>
                  <Badge variant={alertVariant(caseData.alert_type)}>{ALERT_LABELS[caseData.alert_type]}</Badge>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Appt status</div>
                  <div>{caseData.appointment_status || '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Appt date</div>
                  <div>{caseData.appointment_date ? format(new Date(caseData.appointment_date), 'PP p') : '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Entered queue</div>
                  <div>{format(new Date(caseData.entered_queue_at), 'PP p')}</div>
                </div>
              </div>

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

              <div className="flex gap-2">
                {caseData.appointment_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/project/${encodeURIComponent(caseData.project_name)}`, '_blank')}
                  >
                    View in project portal <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
                {!caseData.controlhub_ticket_id && (
                  <Button size="sm" onClick={createTicket} disabled={creatingTicket}>
                    <Ticket className="h-3 w-3 mr-1" />
                    {creatingTicket ? 'Creating…' : 'Create ControlHub Ticket'}
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
                      <div className="whitespace-pre-wrap">{n.note}</div>
                    </div>
                  ))}
                  {notes.length === 0 && <div className="text-xs text-muted-foreground">No notes yet.</div>}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Activity</div>
                <div className="space-y-1 max-h-48 overflow-y-auto text-sm">
                  {activity.map((a) => (
                    <div key={a.id} className="flex justify-between border-b py-1">
                      <span>{a.description || a.activity_type}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                  ))}
                  {activity.length === 0 && <div className="text-xs text-muted-foreground">No activity yet.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
