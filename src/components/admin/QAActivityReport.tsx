import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, startOfWeek, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar as CalendarIcon, Download, Loader2, RefreshCw } from 'lucide-react';

const TZ = 'America/Chicago';

const ALERT_LABELS: Record<string, string> = {
  short_notice: 'Short-Notice',
  oon: 'OON',
  confirmed_audit: 'Confirmed Audit',
  review_queue: 'Review Queue',
  no_show: 'No-Show',
  cancelled: 'Cancellation',
};

type ActionKey = 'opened' | 'claimed' | 'completed' | 'reopened' | 'escalated' | 'ticket_created' | 'audit_update' | 'other';

const ACTION_LABELS: Record<ActionKey, string> = {
  opened: 'Opened',
  claimed: 'Claimed',
  completed: 'Completed',
  reopened: 'Reopened',
  escalated: 'Escalated',
  ticket_created: 'Ticket Created',
  audit_update: 'Audit Updated',
  other: 'Other',
};

interface ActivityRow {
  id: string;
  case_id: string;
  activity_type: string;
  description: string | null;
  actor_user_id: string | null;
  created_at: string;
}

interface CaseInfo {
  id: string;
  project_name: string;
  patient_name: string | null;
  alert_type: string;
  workflow_status: string;
  patient_link: string | null;
  qa_name: string | null;
}

interface LogEntry {
  id: string;
  at: string;
  specialist: string;
  caseId: string;
  patient: string;
  patientLink: string | null;
  clinic: string;
  alertType: string;
  action: ActionKey;
  status: string;
  turnaroundMs: number | null;
}

const deriveAction = (a: ActivityRow): ActionKey => {
  const d = (a.description || '').toLowerCase();
  if (a.activity_type === 'ticket_created') return 'ticket_created';
  if (a.activity_type === 'audit_update') return 'audit_update';
  if (a.activity_type === 'assignment') return 'claimed';
  if (a.activity_type === 'status_change') {
    if (d.includes('reopened')) return 'reopened';
    if (d.includes('completed')) return 'completed';
    if (d.includes('escalated')) return 'escalated';
    if (d.includes('opened') || d.includes('in review')) return 'opened';
  }
  return 'other';
};

const SYSTEM_TYPES = new Set(['created', 'alert_repeat', 'realerted', 'review_queue_duration', 'bulk_completed']);

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

const fmt = (iso: string, pattern = 'MMM d, yyyy h:mm a') => formatInTimeZone(new Date(iso), TZ, pattern);

// minutes-of-day in Central Time
const ctMinutes = (iso: string) => {
  const hhmm = formatInTimeZone(new Date(iso), TZ, 'HH:mm');
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const parseHHMM = (v: string, fallback: number) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!match) return fallback;
  const h = Math.min(23, Number(match[1]));
  const m = Math.min(59, Number(match[2]));
  return h * 60 + m;
};

export default function QAActivityReport() {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [cases, setCases] = useState<Record<string, CaseInfo>>({});
  const [people, setPeople] = useState<Record<string, string>>({});
  const [priorOpens, setPriorOpens] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 6));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59');
  const [projectFilter, setProjectFilter] = useState('all');
  const [qaFilter, setQaFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [logLimit, setLogLimit] = useState(200);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const from = new Date(`${format(dateFrom, 'yyyy-MM-dd')}T00:00:00`);
      const to = new Date(`${format(dateTo, 'yyyy-MM-dd')}T23:59:59.999`);

      const PAGE = 1000;
      const acts: ActivityRow[] = [];
      for (let page = 0; page < 60; page++) {
        const { data, error } = await supabase
          .from('qa_case_activity' as any)
          .select('id, case_id, activity_type, description, actor_user_id, created_at')
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
      const caseMap: Record<string, CaseInfo> = {};
      for (let i = 0; i < caseIds.length; i += 200) {
        const chunk = caseIds.slice(i, i + 200);
        const { data } = await supabase
          .from('qa_cases' as any)
          .select('id, project_name, patient_name, alert_type, workflow_status, patient_link, qa_name')
          .in('id', chunk);
        for (const c of ((data as any[]) || []) as CaseInfo[]) caseMap[c.id] = c;
      }

      // Prior "opened" events (before the window) for cases completed inside the window,
      // so turnaround is accurate even when the alert was opened on a previous day.
      const completedCaseIds = Array.from(
        new Set(acts.filter((a) => deriveAction(a) === 'completed').map((a) => a.case_id)),
      );
      const prior: ActivityRow[] = [];
      for (let i = 0; i < completedCaseIds.length; i += 100) {
        const chunk = completedCaseIds.slice(i, i + 100);
        const { data } = await supabase
          .from('qa_case_activity' as any)
          .select('id, case_id, activity_type, description, actor_user_id, created_at')
          .in('case_id', chunk)
          .eq('activity_type', 'status_change')
          .lt('created_at', from.toISOString())
          .order('created_at', { ascending: false });
        prior.push(...(((data as any[]) || []) as ActivityRow[]));
      }

      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email');
      const pm: Record<string, string> = {};
      for (const p of ((profiles as any[]) || [])) pm[p.id] = p.full_name || p.email || p.id.slice(0, 8);

      setActivities(acts);
      setCases(caseMap);
      setPriorOpens(prior);
      setPeople(pm);
    } catch (e: any) {
      console.error('[QAActivityReport] fetch failed', e);
      toast({ title: 'Could not load activity data', description: e.message, variant: 'destructive' });
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

  // Every actionable activity in the window (before UI filters), used for turnaround lookups.
  const allEntries = useMemo(() => {
    const opensByCase = new Map<string, string[]>();
    const push = (a: ActivityRow) => {
      if (deriveAction(a) !== 'opened') return;
      const arr = opensByCase.get(a.case_id) || [];
      arr.push(a.created_at);
      opensByCase.set(a.case_id, arr);
    };
    activities.forEach(push);
    priorOpens.forEach(push);
    for (const [, arr] of opensByCase) arr.sort();

    return activities
      .filter((a) => !SYSTEM_TYPES.has(a.activity_type))
      .map<LogEntry>((a) => {
        const c = cases[a.case_id];
        const action = deriveAction(a);
        let turnaroundMs: number | null = null;
        if (action === 'completed') {
          const opens = opensByCase.get(a.case_id) || [];
          const last = [...opens].reverse().find((o) => o < a.created_at);
          if (last) turnaroundMs = new Date(a.created_at).getTime() - new Date(last).getTime();
        }
        return {
          id: a.id,
          at: a.created_at,
          specialist: (a.actor_user_id && people[a.actor_user_id]) || c?.qa_name || 'System / Unattributed',
          caseId: a.case_id,
          patient: c?.patient_name || '—',
          patientLink: c?.patient_link || null,
          clinic: c?.project_name || '—',
          alertType: c?.alert_type || '—',
          action,
          status: c?.workflow_status || '—',
          turnaroundMs,
        };
      })
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [activities, priorOpens, cases, people]);

  const entries = useMemo(
    () =>
      allEntries.filter((e) => {
        const m = ctMinutes(e.at);
        if (m < minFrom || m > minTo) return false;
        if (projectFilter !== 'all' && e.clinic !== projectFilter) return false;
        if (qaFilter !== 'all' && e.specialist !== qaFilter) return false;
        if (alertFilter !== 'all' && e.alertType !== alertFilter) return false;
        if (actionFilter !== 'all' && e.action !== actionFilter) return false;
        return true;
      }),
    [allEntries, minFrom, minTo, projectFilter, qaFilter, alertFilter, actionFilter],
  );

  const clinics = useMemo(() => Array.from(new Set(allEntries.map((e) => e.clinic))).sort(), [allEntries]);
  const specialists = useMemo(() => Array.from(new Set(allEntries.map((e) => e.specialist))).sort(), [allEntries]);

  interface SummaryRow {
    specialist: string;
    opened: Set<string>;
    claimed: Set<string>;
    completed: Set<string>;
    reopened: Set<string>;
    tickets: number;
    turnarounds: number[];
    first: string | null;
    last: string | null;
  }

  const summary = useMemo(() => {
    const map = new Map<string, SummaryRow>();
    for (const e of entries) {
      const row =
        map.get(e.specialist) ||
        ({
          specialist: e.specialist,
          opened: new Set<string>(),
          claimed: new Set<string>(),
          completed: new Set<string>(),
          reopened: new Set<string>(),
          tickets: 0,
          turnarounds: [],
          first: null,
          last: null,
        } as SummaryRow);
      if (e.action === 'opened') row.opened.add(e.caseId);
      if (e.action === 'claimed') row.claimed.add(e.caseId);
      if (e.action === 'completed') {
        row.completed.add(e.caseId);
        if (e.turnaroundMs !== null) row.turnarounds.push(e.turnaroundMs);
      }
      if (e.action === 'reopened') row.reopened.add(e.caseId);
      if (e.action === 'ticket_created') row.tickets += 1;
      if (!row.first || e.at < row.first) row.first = e.at;
      if (!row.last || e.at > row.last) row.last = e.at;
      map.set(e.specialist, row);
    }
    return Array.from(map.values())
      .map((r) => {
        const stillWorking = Array.from(r.opened).filter(
          (id) => !r.completed.has(id) && cases[id]?.workflow_status !== 'completed',
        ).length;
        const avgMs = r.turnarounds.length
          ? r.turnarounds.reduce((a, b) => a + b, 0) / r.turnarounds.length
          : null;
        return {
          specialist: r.specialist,
          opened: r.opened.size,
          claimed: r.claimed.size,
          completed: r.completed.size,
          reopened: r.reopened.size,
          tickets: r.tickets,
          stillWorking,
          avgMs,
          first: r.first,
          last: r.last,
        };
      })
      .sort((a, b) => b.completed - a.completed || b.opened - a.opened);
  }, [entries, cases]);

  const totals = useMemo(
    () => ({
      opened: new Set(entries.filter((e) => e.action === 'opened').map((e) => e.caseId)).size,
      completed: new Set(entries.filter((e) => e.action === 'completed').map((e) => e.caseId)).size,
      reopened: new Set(entries.filter((e) => e.action === 'reopened').map((e) => e.caseId)).size,
      tickets: entries.filter((e) => e.action === 'ticket_created').length,
      actions: entries.length,
      specialists: summary.length,
    }),
    [entries, summary],
  );

  const stamp = `${format(dateFrom, 'yyyy-MM-dd')}_to_${format(dateTo, 'yyyy-MM-dd')}_${timeFrom.replace(':', '')}-${timeTo.replace(':', '')}`;

  const summarySheet = () =>
    summary.map((r) => ({
      'QA Specialist': r.specialist,
      'Alerts Opened (unique)': r.opened,
      'Alerts Claimed': r.claimed,
      'Alerts Completed': r.completed,
      'Alerts Reopened': r.reopened,
      'Tickets Created': r.tickets,
      'Still Being Worked': r.stillWorking,
      'Avg Open → Complete': humanizeMs(r.avgMs),
      'First Activity (CT)': r.first ? fmt(r.first, 'yyyy-MM-dd HH:mm') : '',
      'Last Activity (CT)': r.last ? fmt(r.last, 'yyyy-MM-dd HH:mm') : '',
    }));

  const logSheet = () =>
    entries.map((e) => ({
      'Date/Time (CT)': fmt(e.at, 'yyyy-MM-dd HH:mm'),
      'QA Specialist': e.specialist,
      Patient: e.patient,
      Clinic: e.clinic,
      'Alert Type': ALERT_LABELS[e.alertType] || e.alertType,
      Action: ACTION_LABELS[e.action],
      'Completion Status': e.status,
      'Open → Complete': humanizeMs(e.turnaroundMs),
      'Patient Link': e.patientLink || '',
    }));

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Metric: 'Date range', Value: `${format(dateFrom, 'MMM d, yyyy')} – ${format(dateTo, 'MMM d, yyyy')}` },
        { Metric: 'Time window (CT)', Value: `${timeFrom} – ${timeTo}` },
        { Metric: 'Specialists active', Value: totals.specialists },
        { Metric: 'Unique alerts opened', Value: totals.opened },
        { Metric: 'Alerts completed', Value: totals.completed },
        { Metric: 'Alerts reopened', Value: totals.reopened },
        { Metric: 'Tickets created', Value: totals.tickets },
        { Metric: 'Total actions logged', Value: totals.actions },
      ]),
      'Overview',
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet()), 'By Specialist');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logSheet()), 'Detailed Log');
    XLSX.writeFile(wb, `qa_specialist_activity_${stamp}.xlsx`);
  };

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(logSheet());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa_specialist_activity_log_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const DatePick = ({ value, onChange, label }: { value: Date; onChange: (d: Date) => void; label: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start font-normal">
          <CalendarIcon className="h-3 w-3 mr-2" />
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

  const preset = (fromDays: number, toDays = 0) => {
    setDateFrom(subDays(new Date(), fromDays));
    setDateTo(subDays(new Date(), toDays));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">QA Specialist Activity</h3>
          <p className="text-sm text-muted-foreground">
            Who opened, worked, and completed alerts — counted by when the action happened (Central Time).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn('h-3 w-3 mr-1', loading && 'animate-spin')} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!entries.length}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={exportExcel} disabled={!entries.length}>
            <Download className="h-3 w-3 mr-1" /> Export to Excel
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
          <Button variant="ghost" size="sm" onClick={() => preset(0)}>Today</Button>
          <Button variant="ghost" size="sm" onClick={() => preset(1, 1)}>Yesterday</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateFrom(startOfWeek(new Date(), { weekStartsOn: 1 })); setDateTo(new Date()); }}
          >
            This week
          </Button>
          <Button variant="ghost" size="sm" onClick={() => preset(6)}>Last 7 days</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Clinic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clinics</SelectItem>
            {clinics.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={qaFilter} onValueChange={setQaFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="QA specialist" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All specialists</SelectItem>
            {specialists.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={alertFilter} onValueChange={setAlertFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Alert type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All alert types</SelectItem>
            {Object.entries(ALERT_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {(Object.keys(ACTION_LABELS) as ActionKey[]).map((k) => (
              <SelectItem key={k} value={k}>{ACTION_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
        </div>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {[
              { label: 'Specialists active', value: totals.specialists },
              { label: 'Unique alerts opened', value: totals.opened },
              { label: 'Alerts completed', value: totals.completed },
              { label: 'Alerts reopened', value: totals.reopened },
              { label: 'Tickets created', value: totals.tickets },
              { label: 'Actions logged', value: totals.actions },
            ].map((m) => (
              <Card key={m.label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-2xl font-semibold">{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">By QA specialist</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QA Specialist</TableHead>
                    <TableHead className="text-right">Opened</TableHead>
                    <TableHead className="text-right">Claimed</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Reopened</TableHead>
                    <TableHead className="text-right">Tickets</TableHead>
                    <TableHead className="text-right">Still Working</TableHead>
                    <TableHead className="text-right">Avg Open → Complete</TableHead>
                    <TableHead>First Activity</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((r) => (
                    <TableRow key={r.specialist}>
                      <TableCell className="font-medium">{r.specialist}</TableCell>
                      <TableCell className="text-right">{r.opened}</TableCell>
                      <TableCell className="text-right">{r.claimed}</TableCell>
                      <TableCell className="text-right">{r.completed}</TableCell>
                      <TableCell className="text-right">{r.reopened}</TableCell>
                      <TableCell className="text-right">{r.tickets}</TableCell>
                      <TableCell className="text-right">{r.stillWorking}</TableCell>
                      <TableCell className="text-right">{humanizeMs(r.avgMs)}</TableCell>
                      <TableCell>{r.first ? fmt(r.first, 'MMM d, h:mm a') : '—'}</TableCell>
                      <TableCell>{r.last ? fmt(r.last, 'MMM d, h:mm a') : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {!summary.length && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">No activity in this window.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detailed activity log ({entries.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date / Time (CT)</TableHead>
                    <TableHead>QA Specialist</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Alert Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Open → Complete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.slice(0, logLimit).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">{fmt(e.at)}</TableCell>
                      <TableCell>{e.specialist}</TableCell>
                      <TableCell>
                        {e.patientLink ? (
                          <a href={e.patientLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            {e.patient}
                          </a>
                        ) : (
                          e.patient
                        )}
                      </TableCell>
                      <TableCell>{e.clinic}</TableCell>
                      <TableCell>{ALERT_LABELS[e.alertType] || e.alertType}</TableCell>
                      <TableCell>{ACTION_LABELS[e.action]}</TableCell>
                      <TableCell className="capitalize">{e.status.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">{humanizeMs(e.turnaroundMs)}</TableCell>
                    </TableRow>
                  ))}
                  {!entries.length && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No actions in this window.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {entries.length > logLimit && (
                <div className="pt-3 text-center">
                  <Button variant="outline" size="sm" onClick={() => setLogLimit((n) => n + 200)}>
                    Show more ({entries.length - logLimit} remaining)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
