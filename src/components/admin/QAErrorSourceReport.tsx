import { Fragment, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { QACaseDrawerStandalone } from './QAOperationsQueue';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, startOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Ticket,
  Clock,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface SourceCase {
  id: string;
  project_name: string;
  patient_name: string | null;
  service_line: string | null;
  alert_type: string;
  workflow_status: string;
  appointment_date: string | null;
  qa_name: string | null;
  error_category: string | null;
  error_source: string | null;
  caught_before_clinic: boolean | null;
  resolution_type: string | null;
  escalated_at: string | null;
  date_resolved: string | null;
  completed_at: string | null;
  entered_queue_at: string;
  first_entered_at: string | null;
  appointment_created_at: string | null;
  controlhub_ticket_id: string | null;
  controlhub_ticket_url: string | null;
  patient_link: string | null;
}

const ALERT_LABELS: Record<string, string> = {
  short_notice: 'Short-Notice',
  oon: 'OON',
  confirmed_audit: 'Confirmed Audit',
  review_queue: 'Review Queue',
  no_show: 'No-Show',
  cancelled: 'Cancellation',
};

const UNSPECIFIED = 'Unspecified';

const enteredAt = (c: SourceCase) => c.first_entered_at || c.entered_queue_at;
const resolvedAt = (c: SourceCase) => c.date_resolved || c.completed_at;
const errorAt = (c: SourceCase) => c.appointment_created_at || enteredAt(c);
const sourceOf = (c: SourceCase) => (c.error_source || '').trim() || UNSPECIFIED;
const qaOf = (c: SourceCase) => (c.qa_name || '').trim() || 'Unassigned';
const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 1000) / 10}%` : '—');

const countBy = (rows: SourceCase[], fn: (r: SourceCase) => string) => {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const key = (fn(r) || '').trim() || '—';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
};

export default function QAErrorSourceReport() {
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const openCase = (id: string) => setOpenCaseId(id);
  const [rows, setRows] = useState<SourceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [preset, setPreset] = useState<'today' | 'week' | 'month' | 'custom'>('custom');
  const [projectFilter, setProjectFilter] = useState('all');
  const [qaFilter, setQaFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const applyPreset = (p: 'today' | 'week' | 'month') => {
    const { from, to } = ctPresetRange(p);
    setDateFrom(from);
    setDateTo(to);
    setPreset(p);
  };

  const fetchRows = async (opts?: { background?: boolean }) => {
    if (!opts?.background) setLoading(true);
    try {
      // Central Time day boundaries so every user sees the same range.
      const from = getCTStartOfDayUTC(dateFrom) as Date;
      const to = getCTEndOfDayUTC(dateTo) as Date;

      const PAGE = 1000;
      const out: any[] = [];
      for (let page = 0; page < 50; page++) {
        const { data, error } = await supabase
          .from('qa_cases' as any)
          .select(
            'id, project_name, patient_name, service_line, alert_type, workflow_status, appointment_date, qa_name, error_category, error_source, caught_before_clinic, resolution_type, escalated_at, date_resolved, completed_at, entered_queue_at, first_entered_at, appointment_created_at, controlhub_ticket_id, controlhub_ticket_url, patient_link',
          )
          // Same date basis as Case Metrics: when the alert entered the QA queue.
          .gte('entered_queue_at', from.toISOString())
          .lte('entered_queue_at', to.toISOString())
          .order('entered_queue_at', { ascending: false })
          .range(page * PAGE, page * PAGE + PAGE - 1);


        if (error) throw error;
        const batch = (data as any[]) || [];
        out.push(...batch);
        if (batch.length < PAGE) break;
      }
      setRows(out as SourceCase[]);
    } catch (e: any) {
      console.error('[QAErrorSourceReport] fetch failed', e);
      toast({ title: 'Could not load error source data', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const projects = useMemo(
    () => Array.from(new Set(rows.map((r) => r.project_name).filter(Boolean))).sort(),
    [rows],
  );
  const qaNames = useMemo(() => Array.from(new Set(rows.map(qaOf))).sort(), [rows]);
  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.error_category).filter(Boolean) as string[])).sort(),
    [rows],
  );

  // Only rows that represent an actual error (same definition as Case Metrics).
  const errors = useMemo(
    () =>
      rows.filter((r) => {
        if (!r.error_category) return false;
        if (projectFilter !== 'all' && r.project_name !== projectFilter) return false;
        if (qaFilter !== 'all' && qaOf(r) !== qaFilter) return false;
        if (alertFilter !== 'all' && r.alert_type !== alertFilter) return false;
        if (categoryFilter !== 'all' && r.error_category !== categoryFilter) return false;
        if (search.trim() && !sourceOf(r).toLowerCase().includes(search.trim().toLowerCase())) return false;
        return true;
      }),
    [rows, projectFilter, qaFilter, alertFilter, categoryFilter, search],
  );

  type SourceGroup = {
    key: string;
    cases: SourceCase[];
    total: number;
    caught: number;
    tickets: number;
    escalated: number;
    lastError: string | null;
    categories: { key: string; count: number }[];
    clinics: { key: string; count: number }[];
    alerts: { key: string; count: number }[];
  };

  const groups = useMemo<SourceGroup[]>(() => {
    const map = new Map<string, SourceCase[]>();
    errors.forEach((r) => {
      const key = sourceOf(r);
      const list = map.get(key) || [];
      list.push(r);
      map.set(key, list);
    });
    return Array.from(map.entries())
      .map(([key, cases]) => ({
        key,
        cases: [...cases].sort(
          (a, b) => new Date(errorAt(b)).getTime() - new Date(errorAt(a)).getTime(),
        ),
        total: cases.length,
        caught: cases.filter((c) => c.caught_before_clinic === true).length,
        tickets: cases.filter((c) => !!c.controlhub_ticket_id).length,
        escalated: cases.filter((c) => !!c.escalated_at).length,
        lastError:
          cases.reduce<string | null>((latest, c) => {
            const t = errorAt(c);
            if (!t) return latest;
            return !latest || new Date(t).getTime() > new Date(latest).getTime() ? t : latest;
          }, null),
        categories: countBy(cases, (c) => c.error_category || ''),
        clinics: countBy(cases, (c) => c.project_name),
        alerts: countBy(cases, (c) => ALERT_LABELS[c.alert_type] || c.alert_type),
      }))
      .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  }, [errors]);

  const topSource = groups[0];
  const caughtBefore = errors.filter((r) => r.caught_before_clinic === true).length;

  const matrixCategories = useMemo(
    () => countBy(errors, (r) => r.error_category || '').slice(0, 8),
    [errors],
  );
  const matrixSources = useMemo(() => groups.slice(0, 12), [groups]);

  const trend = useMemo(() => {
    const scoped = expanded ? errors.filter((r) => sourceOf(r) === expanded) : errors;
    const map = new Map<string, { label: string; errors: number; ts: number }>();
    scoped.forEach((r) => {
      const d = new Date(errorAt(r));
      if (isNaN(d.getTime())) return;
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const label = format(start, 'MMM d');
      const g = map.get(label) || { label, errors: 0, ts: start.getTime() };
      g.errors += 1;
      map.set(label, g);
    });
    return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
  }, [errors, expanded]);

  const stamp = `${format(dateFrom, 'yyyy-MM-dd')}_to_${format(dateTo, 'yyyy-MM-dd')}`;

  const linkedRecordRows = (list: SourceCase[] = errors) =>
    list.map((r) => ({
      'Error Source': sourceOf(r),
      Patient: r.patient_name || '',
      Clinic: r.project_name,
      Service: r.service_line || '',
      'Appointment Date': r.appointment_date ? format(new Date(r.appointment_date), 'yyyy-MM-dd HH:mm') : '',
      'Error Category': r.error_category || '',
      'Alert Type': ALERT_LABELS[r.alert_type] || r.alert_type,
      'QA Specialist': qaOf(r),
      'Caught Before Clinic': r.caught_before_clinic === null ? '' : r.caught_before_clinic ? 'Yes' : 'No',
      Resolution: r.resolution_type || '',
      'Date Resolved': resolvedAt(r) ? format(new Date(resolvedAt(r) as string), 'yyyy-MM-dd HH:mm') : '',
      'Record Created': r.appointment_created_at
        ? format(new Date(r.appointment_created_at), 'yyyy-MM-dd HH:mm')
        : '',
      'Ticket ID': r.controlhub_ticket_id || '',
      'Ticket URL': r.controlhub_ticket_url || '',
      'Patient Link': r.patient_link || '',
    }));

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Metric: 'Date range', Value: `${format(dateFrom, 'MMM d, yyyy')} – ${format(dateTo, 'MMM d, yyyy')}` },
        { Metric: 'Total errors', Value: errors.length },
        { Metric: 'Distinct sources', Value: groups.length },
        {
          Metric: 'Avg errors per source',
          Value: groups.length ? Math.round((errors.length / groups.length) * 10) / 10 : 0,
        },
        { Metric: 'Top source', Value: topSource ? `${topSource.key} (${topSource.total})` : '—' },
        { Metric: 'Caught before clinic', Value: `${caughtBefore} (${pct(caughtBefore, errors.length)})` },
      ]),
      'Summary',
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        groups.map((g) => ({
          'Error Source': g.key,
          Errors: g.total,
          '% of Errors': pct(g.total, errors.length),
          'Top Categories': g.categories.slice(0, 3).map((c) => `${c.key} (${c.count})`).join(', '),
          Clinics: g.clinics.map((c) => `${c.key} (${c.count})`).join(', '),
          'Caught Before Clinic': g.caught,
          Escalated: g.escalated,
          Tickets: g.tickets,
          'Last Error': g.lastError ? format(new Date(g.lastError), 'yyyy-MM-dd') : '',
        })),
      ),
      'By Source',
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        matrixSources.map((g) => {
          const row: Record<string, string | number> = { 'Error Source': g.key };
          matrixCategories.forEach((c) => {
            row[c.key] = g.categories.find((x) => x.key === c.key)?.count || 0;
          });
          row.Total = g.total;
          return row;
        }),
      ),
      'Category x Source',
    );

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linkedRecordRows()), 'Linked Records');

    XLSX.writeFile(wb, `qa-error-sources_${stamp}.xlsx`);
    toast({ title: 'Report exported', description: `${errors.length} errors included.` });
  };

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(linkedRecordRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-error-source-records_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const DatePick = ({ value, onChange, label }: { value: Date; onChange: (d: Date) => void; label: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start">
          <CalendarIcon className="h-3 w-3 mr-1" />
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

  const cards = [
    { label: 'Total errors', value: String(errors.length) },
    { label: 'Sources with errors', value: String(groups.length) },
    {
      label: 'Avg errors / source',
      value: groups.length ? (Math.round((errors.length / groups.length) * 10) / 10).toFixed(1) : '0',
    },
    { label: 'Top source', value: topSource ? topSource.key : '—', hint: topSource ? `${topSource.total} errors` : undefined },
    { label: 'Caught before clinic', value: pct(caughtBefore, errors.length), hint: `${caughtBefore} errors` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">QA Error Source</h3>
          <p className="text-sm text-muted-foreground">
            Who the errors came from, what kind they were, and the records they're linked to.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchRows()} disabled={loading}>
            <RefreshCw className={cn('h-3 w-3 mr-1', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!errors.length}>
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
          <Button size="sm" onClick={exportExcel} disabled={!errors.length}>
            <Download className="h-3 w-3 mr-1" />
            Export to Excel
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          {([
            { key: 'today', label: 'Today', icon: Clock },
            { key: 'week', label: 'This Week', icon: CalendarIcon },
            { key: 'month', label: 'This Month', icon: CalendarIcon },
          ] as const).map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              type="button"
              variant={preset === key ? 'default' : 'secondary'}
              size="sm"
              className="rounded-full"
              onClick={() => applyPreset(key)}
            >
              <Icon className="h-3 w-3 mr-1" />
              {label}
            </Button>
          ))}
        </div>
        <div className="h-6 w-px bg-border mx-1" />
        <DatePick value={dateFrom} onChange={(d) => { setDateFrom(d); setPreset('custom'); }} label="From" />
        <span className="text-muted-foreground text-sm">→</span>
        <DatePick value={dateTo} onChange={(d) => { setDateTo(d); setPreset('custom'); }} label="To" />


        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="All clinics" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All clinics</SelectItem>
            {projects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={qaFilter} onValueChange={setQaFilter}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="All QA specialists" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All QA specialists</SelectItem>
            {qaNames.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={alertFilter} onValueChange={setAlertFilter}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="All alert types" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All alert types</SelectItem>
            {Object.entries(ALERT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="All error categories" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All error categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search source…"
          className="h-9 w-[190px]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cards.map((c) => (
              <Card key={c.label}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold truncate" title={c.value}>{c.value}</div>
                  {c.hint && <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Errors by source</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Errors</TableHead>
                      <TableHead className="text-right">% of all</TableHead>
                      <TableHead>Top categories</TableHead>
                      <TableHead>Clinics</TableHead>
                      <TableHead className="text-right">Caught</TableHead>
                      <TableHead className="text-right">Escalated</TableHead>
                      <TableHead className="text-right">Tickets</TableHead>
                      <TableHead>Last error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((g) => {
                      const isOpen = expanded === g.key;
                      return (
                        <Fragment key={g.key}>
                          <TableRow
                            className="cursor-pointer"
                            onClick={() => setExpanded(isOpen ? null : g.key)}
                          >
                            <TableCell className="px-2">
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-medium">{g.key}</TableCell>
                            <TableCell className="text-right font-semibold">{g.total}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{pct(g.total, errors.length)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {g.categories.slice(0, 3).map((c) => `${c.key} (${c.count})`).join(', ')}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {g.clinics.slice(0, 2).map((c) => c.key).join(', ')}
                              {g.clinics.length > 2 ? ` +${g.clinics.length - 2}` : ''}
                            </TableCell>
                            <TableCell className="text-right">{g.caught}</TableCell>
                            <TableCell className="text-right">{g.escalated}</TableCell>
                            <TableCell className="text-right">{g.tickets}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {g.lastError ? format(new Date(g.lastError), 'MMM d, yyyy') : '—'}
                            </TableCell>
                          </TableRow>

                          {isOpen && (
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                              <TableCell colSpan={10} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  {[
                                    { title: 'By category', data: g.categories },
                                    { title: 'By clinic', data: g.clinics },
                                    { title: 'By alert type', data: g.alerts },
                                  ].map((block) => (
                                    <div key={block.title} className="rounded-md border bg-background p-3">
                                      <p className="text-xs font-semibold mb-2">{block.title}</p>
                                      <div className="space-y-1">
                                        {block.data.map((d) => (
                                          <div key={d.key} className="flex justify-between text-xs">
                                            <span className="truncate mr-2">{d.key}</span>
                                            <span className="text-muted-foreground">{d.count}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <p className="text-xs font-semibold mb-2">
                                  Linked records ({g.cases.length})
                                </p>
                                <div className="rounded-md border bg-background overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Patient</TableHead>
                                        <TableHead>Clinic</TableHead>
                                        <TableHead>Service</TableHead>
                                        <TableHead>Appt date</TableHead>
                                        <TableHead>Error category</TableHead>
                                        <TableHead>Alert</TableHead>
                                        <TableHead>QA</TableHead>
                                        <TableHead>Resolution</TableHead>
                                        <TableHead>Resolved</TableHead>
                                        <TableHead>Links</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {g.cases.map((c) => (
                                        <TableRow
                                          key={c.id}
                                          role="button"
                                          tabIndex={0}
                                          title="Open record"
                                          className="cursor-pointer hover:bg-muted/60"
                                          onClick={() => openCase(c.id)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              openCase(c.id);
                                            }
                                          }}
                                        >
                                          <TableCell className="font-medium">{c.patient_name || '—'}</TableCell>
                                          <TableCell className="text-xs">{c.project_name}</TableCell>
                                          <TableCell className="text-xs">{c.service_line || '—'}</TableCell>
                                          <TableCell className="text-xs">
                                            {c.appointment_date ? format(new Date(c.appointment_date), 'MMM d, yyyy') : '—'}
                                          </TableCell>
                                          <TableCell className="text-xs">
                                            <Badge variant="outline">{c.error_category}</Badge>
                                          </TableCell>
                                          <TableCell className="text-xs">{ALERT_LABELS[c.alert_type] || c.alert_type}</TableCell>
                                          <TableCell className="text-xs">{qaOf(c)}</TableCell>
                                          <TableCell className="text-xs">{c.resolution_type || '—'}</TableCell>
                                          <TableCell className="text-xs">
                                            {resolvedAt(c) ? format(new Date(resolvedAt(c) as string), 'MMM d, yyyy') : '—'}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              {c.patient_link && (
                                                <a
                                                  href={c.patient_link}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <ExternalLink className="h-3 w-3" /> Record
                                                </a>
                                              )}
                                              {c.controlhub_ticket_url && (
                                                <a
                                                  href={c.controlhub_ticket_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <Ticket className="h-3 w-3" /> Ticket
                                                </a>
                                              )}
                                              {!c.patient_link && !c.controlhub_ticket_url && (
                                                <span className="text-xs text-muted-foreground">—</span>
                                              )}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                    {groups.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                          No errors recorded for this range and filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {matrixSources.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Category × source</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        {matrixCategories.map((c) => (
                          <TableHead key={c.key} className="text-right text-xs">{c.key}</TableHead>
                        ))}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrixSources.map((g) => (
                        <TableRow key={g.key}>
                          <TableCell className="font-medium">{g.key}</TableCell>
                          {matrixCategories.map((c) => {
                            const n = g.categories.find((x) => x.key === c.key)?.count || 0;
                            return (
                              <TableCell
                                key={c.key}
                                className={cn('text-right', n === 0 && 'text-muted-foreground/50')}
                              >
                                {n || '·'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-semibold">{g.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Weekly errors{expanded ? ` — ${expanded}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {trend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <ReTooltip />
                    <Bar dataKey="errors" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No error data in range.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <QACaseDrawerStandalone
        caseId={openCaseId}
        onClose={() => { setOpenCaseId(null); fetchRows({ background: true }); }}
      />
    </div>
  );
}
