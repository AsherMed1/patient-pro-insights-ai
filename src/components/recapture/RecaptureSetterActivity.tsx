import { Fragment, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';
import { format, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar as CalendarIcon, ChevronDown, ChevronRight, Download, Loader2, RefreshCw } from 'lucide-react';
import RecaptureCaseDrawer from './RecaptureCaseDrawer';
import { RECAPTURE_ACTION_LABELS } from './activityLog';
import {
  CHANNEL_LABELS, COMPLETION_REASON_LABELS, CONVERSATION_OUTCOME_LABELS,
  RESULT_LABELS, WORK_STATUS_LABELS, type RecaptureCase,
} from './types';

const TZ = 'America/Chicago';

interface ActivityRow {
  id: string;
  case_id: string;
  activity_type: string;
  description: string | null;
  channel: string | null;
  result: string | null;
  conversation_outcome: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  created_at: string;
}

interface LogEntry {
  id: string;
  at: string;
  setter: string;
  caseId: string;
  patient: string;
  clinic: string;
  bucket: string;
  action: string;
  channel: string | null;
  result: string | null;
  outcome: string | null;
  completionReason: string | null;
  turnaroundMs: number | null;
}

interface RecordGroup {
  key: string;
  setter: string;
  caseId: string;
  patient: string;
  clinic: string;
  bucket: string;
  actions: LogEntry[];
  actionCounts: Record<string, number>;
  openedAt: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  completionReason: string | null;
  first: string;
  last: string;
  turnaroundMs: number | null;
}

const humanizeMs = (ms: number | null) => {
  if (ms === null || !isFinite(ms) || ms < 0) return '—';
  const totalMinutes = Math.round(ms / 60000);
  const d = Math.floor(totalMinutes / 1440);
  const h = Math.floor((totalMinutes % 1440) / 60);
  const m = totalMinutes % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const fmt = (iso: string | null, pattern = 'MMM d, yyyy h:mm a') =>
  iso ? formatInTimeZone(new Date(iso), TZ, pattern) : '—';

const ctMinutes = (iso: string) => {
  const [h, m] = formatInTimeZone(new Date(iso), TZ, 'HH:mm').split(':').map(Number);
  return h * 60 + m;
};

const parseHHMM = (v: string, fallback: number) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!match) return fallback;
  return Math.min(23, Number(match[1])) * 60 + Math.min(59, Number(match[2]));
};

export default function RecaptureSetterActivity() {
  const { isReviewOnly, isRecaptureRole, accessibleProjects } = useRole();

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [cases, setCases] = useState<Record<string, RecaptureCase>>({});
  const [people, setPeople] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 6));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59');
  const [projectFilter, setProjectFilter] = useState('all');
  const [setterFilter, setSetterFilter] = useState('all');
  const [bucketFilter, setBucketFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [logLimit, setLogLimit] = useState(200);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drawerCase, setDrawerCase] = useState<RecaptureCase | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleGroup = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const from = new Date(`${format(dateFrom, 'yyyy-MM-dd')}T00:00:00`);
      const to = new Date(`${format(dateTo, 'yyyy-MM-dd')}T23:59:59.999`);

      const PAGE = 1000;
      const acts: ActivityRow[] = [];
      for (let page = 0; page < 60; page++) {
        const { data, error } = await supabase
          .from('recapture_case_activity' as any)
          .select('*')
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString())
          .order('created_at', { ascending: false })
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw error;
        const batch = ((data as any[]) || []) as ActivityRow[];
        acts.push(...batch);
        if (batch.length < PAGE) break;
      }

      const caseIds = Array.from(new Set(acts.map((a) => a.case_id).filter(Boolean)));
      const caseMap: Record<string, RecaptureCase> = {};
      for (let i = 0; i < caseIds.length; i += 200) {
        const chunk = caseIds.slice(i, i + 200);
        const { data } = await supabase.from('recapture_cases' as any).select('*').in('id', chunk);
        for (const c of ((data as any[]) || []) as RecaptureCase[]) caseMap[c.id] = c;
      }

      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email');
      const pm: Record<string, string> = {};
      for (const p of ((profiles as any[]) || [])) pm[p.id] = p.full_name || p.email || p.id.slice(0, 8);

      setActivities(acts);
      setCases(caseMap);
      setPeople(pm);
    } catch (e: any) {
      console.error('[RecaptureSetterActivity] fetch failed', e);
      toast({ title: 'Could not load setter activity', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const minFrom = parseHHMM(timeFrom, 0);
  const minTo = parseHHMM(timeTo, 1439);
  const scoped = isReviewOnly() || isRecaptureRole();
  const projectKey = accessibleProjects.join(',');

  const allEntries = useMemo(() => {
    // Earliest open per case powers the open → complete duration.
    const opensByCase = new Map<string, string[]>();
    for (const a of activities) {
      if (a.activity_type !== 'opened') continue;
      const arr = opensByCase.get(a.case_id) || [];
      arr.push(a.created_at);
      opensByCase.set(a.case_id, arr);
    }
    for (const [, arr] of opensByCase) arr.sort();

    return activities
      .map<LogEntry>((a) => {
        const c = cases[a.case_id];
        let turnaroundMs: number | null = null;
        if (a.activity_type === 'completed') {
          const opens = opensByCase.get(a.case_id) || [];
          const last = [...opens].reverse().find((o) => o < a.created_at) || c?.opened_at || null;
          if (last && last < a.created_at) {
            turnaroundMs = new Date(a.created_at).getTime() - new Date(last).getTime();
          }
        }
        return {
          id: a.id,
          at: a.created_at,
          setter:
            (a.actor_user_id && people[a.actor_user_id]) || a.actor_name || 'System / Unattributed',
          caseId: a.case_id,
          patient: c?.patient_name || '—',
          clinic: c?.project_name || '—',
          bucket: c?.work_status || '—',
          action: a.activity_type,
          channel: a.channel,
          result: a.result,
          outcome: a.conversation_outcome,
          completionReason: c?.completion_reason || null,
          turnaroundMs,
        };
      })
      .filter((e) => !scoped || accessibleProjects.length === 0 || accessibleProjects.includes(e.clinic))
      .sort((a, b) => (a.at < b.at ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, cases, people, scoped, projectKey]);

  const entries = useMemo(
    () =>
      allEntries.filter((e) => {
        const m = ctMinutes(e.at);
        if (m < minFrom || m > minTo) return false;
        if (projectFilter !== 'all' && e.clinic !== projectFilter) return false;
        if (setterFilter !== 'all' && e.setter !== setterFilter) return false;
        if (bucketFilter !== 'all' && e.bucket !== bucketFilter) return false;
        if (channelFilter !== 'all' && e.channel !== channelFilter) return false;
        if (resultFilter !== 'all' && e.result !== resultFilter) return false;
        if (actionFilter !== 'all' && e.action !== actionFilter) return false;
        return true;
      }),
    [allEntries, minFrom, minTo, projectFilter, setterFilter, bucketFilter, channelFilter, resultFilter, actionFilter],
  );

  const groups = useMemo(() => {
    const map = new Map<string, RecordGroup>();
    for (const e of entries) {
      const key = `${e.setter}::${e.caseId}`;
      const g =
        map.get(key) ||
        ({
          key,
          setter: e.setter,
          caseId: e.caseId,
          patient: e.patient,
          clinic: e.clinic,
          bucket: e.bucket,
          actions: [],
          actionCounts: {},
          openedAt: null,
          claimedAt: null,
          completedAt: null,
          completionReason: e.completionReason,
          first: e.at,
          last: e.at,
          turnaroundMs: null,
        } as RecordGroup);
      g.actions.push(e);
      g.actionCounts[e.action] = (g.actionCounts[e.action] || 0) + 1;
      if (e.action === 'opened' && (!g.openedAt || e.at < g.openedAt)) g.openedAt = e.at;
      if (e.action === 'assignment' && (!g.claimedAt || e.at < g.claimedAt)) g.claimedAt = e.at;
      if (e.action === 'completed' && (!g.completedAt || e.at > g.completedAt)) g.completedAt = e.at;
      if (e.at < g.first) g.first = e.at;
      if (e.at > g.last) g.last = e.at;
      if (e.turnaroundMs !== null && (g.turnaroundMs === null || e.turnaroundMs > g.turnaroundMs)) {
        g.turnaroundMs = e.turnaroundMs;
      }
      map.set(key, g);
    }
    const list = Array.from(map.values());
    for (const g of list) g.actions.sort((a, b) => (a.at < b.at ? 1 : -1));
    return list.sort((a, b) => (a.last < b.last ? 1 : -1));
  }, [entries]);

  const clinics = useMemo(() => Array.from(new Set(allEntries.map((e) => e.clinic))).sort(), [allEntries]);
  const setters = useMemo(() => Array.from(new Set(allEntries.map((e) => e.setter))).sort(), [allEntries]);
  const results = useMemo(
    () => Array.from(new Set(allEntries.map((e) => e.result).filter(Boolean))).sort() as string[],
    [allEntries],
  );

  const summary = useMemo(() => {
    interface Row {
      setter: string;
      opened: Set<string>;
      claimed: Set<string>;
      completed: Set<string>;
      calls: number;
      texts: number;
      emails: number;
      followUps: number;
      actions: number;
    }
    const map = new Map<string, Row>();
    for (const e of entries) {
      const row =
        map.get(e.setter) ||
        ({
          setter: e.setter,
          opened: new Set<string>(),
          claimed: new Set<string>(),
          completed: new Set<string>(),
          calls: 0, texts: 0, emails: 0, followUps: 0, actions: 0,
        } as Row);
      row.actions += 1;
      if (e.action === 'opened') row.opened.add(e.caseId);
      if (e.action === 'assignment') row.claimed.add(e.caseId);
      if (e.action === 'completed') row.completed.add(e.caseId);
      if (e.action === 'follow_up_scheduled') row.followUps += 1;
      if (e.action === 'attempt') {
        if (e.channel === 'call') row.calls += 1;
        else if (e.channel === 'text') row.texts += 1;
        else if (e.channel === 'email') row.emails += 1;
      }
      map.set(e.setter, row);
    }
    return Array.from(map.values())
      .map((r) => ({
        setter: r.setter,
        opened: r.opened.size,
        claimed: r.claimed.size,
        calls: r.calls,
        texts: r.texts,
        emails: r.emails,
        followUps: r.followUps,
        completed: r.completed.size,
        actions: r.actions,
      }))
      .sort((a, b) => b.actions - a.actions || b.completed - a.completed);
  }, [entries]);

  const totals = useMemo(
    () => ({
      setters: summary.length,
      opened: new Set(entries.filter((e) => e.action === 'opened').map((e) => e.caseId)).size,
      claimed: new Set(entries.filter((e) => e.action === 'assignment').map((e) => e.caseId)).size,
      attempts: entries.filter((e) => e.action === 'attempt').length,
      followUps: entries.filter((e) => e.action === 'follow_up_scheduled').length,
      completed: new Set(entries.filter((e) => e.action === 'completed').map((e) => e.caseId)).size,
      actions: entries.length,
    }),
    [entries, summary],
  );

  const stamp = `${format(dateFrom, 'yyyy-MM-dd')}_to_${format(dateTo, 'yyyy-MM-dd')}_${timeFrom.replace(':', '')}-${timeTo.replace(':', '')}`;

  const summarySheet = () =>
    summary.map((r) => ({
      Setter: r.setter,
      'Records Opened (unique)': r.opened,
      'Records Claimed': r.claimed,
      Calls: r.calls,
      Texts: r.texts,
      Emails: r.emails,
      'Follow-Ups Scheduled': r.followUps,
      'Records Completed': r.completed,
      'Total Actions': r.actions,
    }));

  const logSheet = () =>
    entries.map((e) => ({
      'Date/Time (CT)': fmt(e.at, 'yyyy-MM-dd HH:mm'),
      Setter: e.setter,
      Patient: e.patient,
      Clinic: e.clinic,
      Bucket: WORK_STATUS_LABELS[e.bucket as keyof typeof WORK_STATUS_LABELS] || e.bucket,
      Action: RECAPTURE_ACTION_LABELS[e.action] || e.action,
      Method: e.channel ? CHANNEL_LABELS[e.channel] || e.channel : '',
      'Attempt Outcome': e.result ? RESULT_LABELS[e.result] || e.result : '',
      'Conversation Outcome': e.outcome
        ? CONVERSATION_OUTCOME_LABELS[e.outcome as keyof typeof CONVERSATION_OUTCOME_LABELS] || e.outcome
        : '',
      'Completion Outcome': e.completionReason
        ? COMPLETION_REASON_LABELS[e.completionReason as keyof typeof COMPLETION_REASON_LABELS] || e.completionReason
        : '',
      'Open → Complete': humanizeMs(e.turnaroundMs),
    }));

  const groupSheet = () =>
    groups.map((g) => ({
      Setter: g.setter,
      Patient: g.patient,
      Clinic: g.clinic,
      Bucket: WORK_STATUS_LABELS[g.bucket as keyof typeof WORK_STATUS_LABELS] || g.bucket,
      'Opened (CT)': fmt(g.openedAt, 'yyyy-MM-dd HH:mm'),
      'Claimed (CT)': fmt(g.claimedAt, 'yyyy-MM-dd HH:mm'),
      'Completed (CT)': fmt(g.completedAt, 'yyyy-MM-dd HH:mm'),
      'Completion Outcome': g.completionReason
        ? COMPLETION_REASON_LABELS[g.completionReason as keyof typeof COMPLETION_REASON_LABELS] || g.completionReason
        : '',
      Attempts: g.actionCounts.attempt || 0,
      'Follow-Ups': g.actionCounts.follow_up_scheduled || 0,
      Actions: g.actions.length,
      'Open → Complete': humanizeMs(g.turnaroundMs),
    }));

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Metric: 'Date range', Value: `${format(dateFrom, 'MMM d, yyyy')} – ${format(dateTo, 'MMM d, yyyy')}` },
        { Metric: 'Time window (CT)', Value: `${timeFrom} – ${timeTo}` },
        { Metric: 'Setters active', Value: totals.setters },
        { Metric: 'Unique records opened', Value: totals.opened },
        { Metric: 'Records claimed', Value: totals.claimed },
        { Metric: 'Outreach attempts logged', Value: totals.attempts },
        { Metric: 'Follow-ups scheduled', Value: totals.followUps },
        { Metric: 'Records completed', Value: totals.completed },
        { Metric: 'Total actions logged', Value: totals.actions },
      ]),
      'Overview',
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet()), 'By Setter');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groupSheet()), 'Records');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logSheet()), 'Detailed Log');
    XLSX.writeFile(wb, `recapture_setter_activity_${stamp}.xlsx`);
  };

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(logSheet());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recapture_setter_activity_log_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const DatePick = ({ value, onChange, label }: { value: Date; onChange: (d: Date) => void; label: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start font-normal">
          <CalendarIcon className="mr-2 h-3 w-3" />
          {label}: {format(value, 'MMM d, yyyy')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarPicker
          mode="single"
          selected={value}
          onSelect={(d) => d && onChange(d)}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );

  const openRecord = (caseId: string) => {
    const c = cases[caseId];
    if (!c) {
      toast({ title: 'Record unavailable', description: 'This recapture record could not be loaded.' });
      return;
    }
    setDrawerCase(c);
    setDrawerOpen(true);
  };

  const cards: { label: string; value: number }[] = [
    { label: 'Setters active', value: totals.setters },
    { label: 'Unique records opened', value: totals.opened },
    { label: 'Records claimed', value: totals.claimed },
    { label: 'Outreach attempts', value: totals.attempts },
    { label: 'Follow-ups scheduled', value: totals.followUps },
    { label: 'Records completed', value: totals.completed },
    { label: 'Actions logged', value: totals.actions },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Recapture Setter Activity</h3>
          <p className="text-sm text-muted-foreground">
            Who opened, worked, and completed recapture records — counted by when the action happened (Central Time).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn('mr-1 h-3 w-3', loading && 'animate-spin')} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!entries.length}>
            <Download className="mr-1 h-3 w-3" /> CSV
          </Button>
          <Button size="sm" onClick={exportExcel} disabled={!entries.length}>
            <Download className="mr-1 h-3 w-3" /> Export to Excel
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DatePick value={dateFrom} onChange={setDateFrom} label="From" />
        <DatePick value={dateTo} onChange={setDateTo} label="To" />
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">Time</span>
          <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="h-9 w-32" />
          <span className="text-muted-foreground">to</span>
          <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="h-9 w-32" />
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(new Date()); setDateTo(new Date()); }}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateFrom(subDays(new Date(), 1)); setDateTo(subDays(new Date(), 1)); }}
          >
            Yesterday
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateFrom(startOfWeek(new Date(), { weekStartsOn: 1 })); setDateTo(new Date()); }}
          >
            This week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateFrom(startOfMonth(new Date())); setDateTo(new Date()); }}
          >
            This month
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="h-9 w-56"><SelectValue placeholder="All clinics" /></SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">All clinics</SelectItem>
            {clinics.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={setterFilter} onValueChange={setSetterFilter}>
          <SelectTrigger className="h-9 w-52"><SelectValue placeholder="All setters" /></SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">All setters</SelectItem>
            {setters.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={bucketFilter} onValueChange={setBucketFilter}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All buckets" /></SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">All buckets</SelectItem>
            {Object.entries(WORK_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All methods" /></SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="h-9 w-52"><SelectValue placeholder="All outcomes" /></SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">All outcomes</SelectItem>
            {results.map((r) => <SelectItem key={r} value={r}>{RESULT_LABELS[r] || r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">All actions</SelectItem>
            {Object.entries(RECAPTURE_ACTION_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">By setter</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setter</TableHead>
                  <TableHead className="text-right">Opened</TableHead>
                  <TableHead className="text-right">Claimed</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Texts</TableHead>
                  <TableHead className="text-right">Emails</TableHead>
                  <TableHead className="text-right">Follow-ups</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Total actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No setter activity in this window.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {summary.map((r) => (
                      <TableRow key={r.setter}>
                        <TableCell className="font-medium">{r.setter}</TableCell>
                        <TableCell className="text-right">{r.opened}</TableCell>
                        <TableCell className="text-right">{r.claimed}</TableCell>
                        <TableCell className="text-right">{r.calls}</TableCell>
                        <TableCell className="text-right">{r.texts}</TableCell>
                        <TableCell className="text-right">{r.emails}</TableCell>
                        <TableCell className="text-right">{r.followUps}</TableCell>
                        <TableCell className="text-right">{r.completed}</TableCell>
                        <TableCell className="text-right">{r.actions}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totals.opened}</TableCell>
                      <TableCell className="text-right">{totals.claimed}</TableCell>
                      <TableCell className="text-right">{summary.reduce((s, r) => s + r.calls, 0)}</TableCell>
                      <TableCell className="text-right">{summary.reduce((s, r) => s + r.texts, 0)}</TableCell>
                      <TableCell className="text-right">{summary.reduce((s, r) => s + r.emails, 0)}</TableCell>
                      <TableCell className="text-right">{totals.followUps}</TableCell>
                      <TableCell className="text-right">{totals.completed}</TableCell>
                      <TableCell className="text-right">{totals.actions}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Detailed activity — {groups.length} record{groups.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Setter</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Clinic</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Opened (CT)</TableHead>
                <TableHead>Claimed (CT)</TableHead>
                <TableHead>Completed (CT)</TableHead>
                <TableHead>Completion outcome</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                <TableHead>Open → Complete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                    No activity matches these filters.
                  </TableCell>
                </TableRow>
              ) : (
                groups.slice(0, logLimit).map((g) => (
                  <Fragment key={g.key}>
                    <TableRow className="cursor-pointer" onClick={() => toggleGroup(g.key)}>
                      <TableCell>
                        {expanded.has(g.key)
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell>{g.setter}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={(e) => { e.stopPropagation(); openRecord(g.caseId); }}
                        >
                          {g.patient}
                        </button>
                      </TableCell>
                      <TableCell>{g.clinic}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {WORK_STATUS_LABELS[g.bucket as keyof typeof WORK_STATUS_LABELS] || g.bucket}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fmt(g.openedAt)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmt(g.claimedAt)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmt(g.completedAt)}</TableCell>
                      <TableCell>
                        {g.completionReason
                          ? COMPLETION_REASON_LABELS[g.completionReason as keyof typeof COMPLETION_REASON_LABELS] || g.completionReason
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">{g.actions.length}</TableCell>
                      <TableCell className="whitespace-nowrap">{humanizeMs(g.turnaroundMs)}</TableCell>
                    </TableRow>
                    {expanded.has(g.key) && (
                      <TableRow>
                        <TableCell colSpan={11} className="bg-muted/40 p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date/Time (CT)</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Attempt outcome</TableHead>
                                <TableHead>Conversation outcome</TableHead>
                                <TableHead>Detail</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {g.actions.map((a) => {
                                const source = activities.find((x) => x.id === a.id);
                                return (
                                  <TableRow key={a.id}>
                                    <TableCell className="whitespace-nowrap">{fmt(a.at)}</TableCell>
                                    <TableCell>{RECAPTURE_ACTION_LABELS[a.action] || a.action}</TableCell>
                                    <TableCell>{a.channel ? CHANNEL_LABELS[a.channel] || a.channel : '—'}</TableCell>
                                    <TableCell>{a.result ? RESULT_LABELS[a.result] || a.result : '—'}</TableCell>
                                    <TableCell>
                                      {a.outcome
                                        ? CONVERSATION_OUTCOME_LABELS[a.outcome as keyof typeof CONVERSATION_OUTCOME_LABELS] || a.outcome
                                        : '—'}
                                    </TableCell>
                                    <TableCell className="max-w-md text-muted-foreground">
                                      {source?.description || '—'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
          {groups.length > logLimit && (
            <div className="flex justify-center border-t p-3">
              <Button variant="outline" size="sm" onClick={() => setLogLimit((n) => n + 200)}>
                Load more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RecaptureCaseDrawer
        caseRow={drawerCase}
        open={drawerOpen}
        onOpenChange={(o) => { setDrawerOpen(o); if (!o) setDrawerCase(null); }}
        ghlUrl={null}
        onOpenPortalRecord={() => {}}
        onChanged={fetchAll}
      />
    </div>
  );
}
