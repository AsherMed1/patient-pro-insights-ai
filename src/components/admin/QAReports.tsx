import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, startOfWeek, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Download, Loader2, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ReportCase {
  id: string;
  project_name: string;
  patient_name: string | null;
  service_line: string | null;
  alert_type: string;
  workflow_status: string;
  appointment_date: string | null;
  appointment_status: string | null;
  qa_name: string | null;
  self_booked: boolean | null;
  error_category: string | null;
  error_source: string | null;
  caught_before_clinic: boolean | null;
  resolution_type: string | null;
  date_resolved: string | null;
  completed_at: string | null;
  entered_queue_at: string;
  first_entered_at: string | null;
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

const enteredAt = (c: ReportCase) => c.first_entered_at || c.entered_queue_at;
const resolvedAt = (c: ReportCase) => c.date_resolved || c.completed_at;

const turnaroundHours = (c: ReportCase): number | null => {
  const start = enteredAt(c);
  const end = resolvedAt(c);
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!isFinite(ms) || ms < 0) return null;
  return ms / 3_600_000;
};

const humanizeHours = (h: number | null) => {
  if (h === null || !isFinite(h)) return '—';
  const totalMinutes = Math.round(h * 60);
  const d = Math.floor(totalMinutes / 1440);
  const hh = Math.floor((totalMinutes % 1440) / 60);
  const mm = totalMinutes % 60;
  if (d > 0) return `${d}d ${hh}h`;
  if (hh > 0) return `${hh}h ${mm}m`;
  return `${mm}m`;
};

const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 1000) / 10}%` : '—');
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

const qaOf = (c: ReportCase) => (c.qa_name || '').trim() || 'Unassigned';

export default function QAReports() {
  const [rows, setRows] = useState<ReportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [projectFilter, setProjectFilter] = useState('all');
  const [qaFilter, setQaFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchRows = async () => {
    setLoading(true);
    try {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);

      const PAGE = 1000;
      const out: any[] = [];
      for (let page = 0; page < 50; page++) {
        const { data, error } = await supabase
          .from('qa_cases' as any)
          .select(
            'id, project_name, patient_name, service_line, alert_type, workflow_status, appointment_date, appointment_status, qa_name, self_booked, error_category, error_source, caught_before_clinic, resolution_type, date_resolved, completed_at, entered_queue_at, first_entered_at, controlhub_ticket_id, controlhub_ticket_url, patient_link',
          )
          .gte('entered_queue_at', from.toISOString())
          .lte('entered_queue_at', to.toISOString())
          .order('entered_queue_at', { ascending: false })
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw error;
        const batch = (data as any[]) || [];
        out.push(...batch);
        if (batch.length < PAGE) break;
      }
      setRows(out as ReportCase[]);
    } catch (e: any) {
      console.error('[QAReports] fetch failed', e);
      toast({ title: 'Could not load report data', description: e.message, variant: 'destructive' });
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
  const qaNames = useMemo(
    () => Array.from(new Set(rows.map(qaOf))).sort(),
    [rows],
  );
  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.error_category).filter(Boolean) as string[])).sort(),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (projectFilter !== 'all' && r.project_name !== projectFilter) return false;
        if (qaFilter !== 'all' && qaOf(r) !== qaFilter) return false;
        if (alertFilter !== 'all' && r.alert_type !== alertFilter) return false;
        if (categoryFilter !== 'all' && r.error_category !== categoryFilter) return false;
        return true;
      }),
    [rows, projectFilter, qaFilter, alertFilter, categoryFilter],
  );

  const errors = useMemo(() => filtered.filter((r) => !!r.error_category), [filtered]);
  const completed = useMemo(() => filtered.filter((r) => r.workflow_status === 'completed'), [filtered]);
  const open = filtered.length - completed.length;
  const turnarounds = useMemo(
    () => filtered.map(turnaroundHours).filter((v): v is number => v !== null),
    [filtered],
  );
  const caughtBefore = errors.filter((r) => r.caught_before_clinic === true).length;
  const ticketsCreated = filtered.filter((r) => !!r.controlhub_ticket_id).length;

  type Group = { key: string; total: number; errors: number; ta: number[]; caught: number; tickets: number };
  const groupBy = (fn: (r: ReportCase) => string): Group[] => {
    const map = new Map<string, Group>();
    filtered.forEach((r) => {
      const key = fn(r) || '—';
      const g = map.get(key) || { key, total: 0, errors: 0, ta: [], caught: 0, tickets: 0 };
      g.total += 1;
      if (r.error_category) g.errors += 1;
      const t = turnaroundHours(r);
      if (t !== null) g.ta.push(t);
      if (r.caught_before_clinic === true) g.caught += 1;
      if (r.controlhub_ticket_id) g.tickets += 1;
      map.set(key, g);
    });
    return Array.from(map.values()).sort((a, b) => b.errors - a.errors || b.total - a.total);
  };

  const byClinic = useMemo(() => groupBy((r) => r.project_name), [filtered]);
  const byQa = useMemo(() => groupBy(qaOf), [filtered]);

  const countBy = (source: ReportCase[], fn: (r: ReportCase) => string) => {
    const map = new Map<string, number>();
    source.forEach((r) => {
      const key = (fn(r) || '').trim() || '—';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  };

  const byCategory = useMemo(() => {
    const base = countBy(errors, (r) => r.error_category || '');
    return base.map((entry) => {
      const clinics = countBy(
        errors.filter((r) => (r.error_category || '—') === entry.key),
        (r) => r.project_name,
      )
        .slice(0, 3)
        .map((c) => `${c.key} (${c.count})`)
        .join(', ');
      return { ...entry, clinics };
    });
  }, [errors]);

  const bySource = useMemo(() => countBy(errors, (r) => r.error_source || ''), [errors]);
  const byResolution = useMemo(() => countBy(filtered, (r) => r.resolution_type || ''), [filtered]);

  const trend = useMemo(() => {
    const map = new Map<string, { label: string; errors: number; audits: number }>();
    filtered.forEach((r) => {
      const d = new Date(enteredAt(r));
      const bucket = format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM d');
      const g = map.get(bucket) || { label: bucket, errors: 0, audits: 0 };
      g.audits += 1;
      if (r.error_category) g.errors += 1;
      map.set(bucket, g);
    });
    return Array.from(map.values()).reverse();
  }, [filtered]);

  const stamp = `${format(dateFrom, 'yyyy-MM-dd')}_to_${format(dateTo, 'yyyy-MM-dd')}`;

  const rawRows = () =>
    filtered.map((r) => ({
      Patient: r.patient_name || '',
      Clinic: r.project_name,
      'Service Line': r.service_line || '',
      'Alert Type': ALERT_LABELS[r.alert_type] || r.alert_type,
      'Workflow Status': r.workflow_status,
      'QA Specialist': qaOf(r),
      'Self Booked': r.self_booked === null ? '' : r.self_booked ? 'Yes' : 'No',
      'Error Category': r.error_category || '',
      'Error Source': r.error_source || '',
      'Caught Before Clinic': r.caught_before_clinic === null ? '' : r.caught_before_clinic ? 'Yes' : 'No',
      Resolution: r.resolution_type || '',
      'Appointment Date': r.appointment_date ? format(new Date(r.appointment_date), 'yyyy-MM-dd HH:mm') : '',
      'Appointment Status': r.appointment_status || '',
      Entered: format(new Date(enteredAt(r)), 'yyyy-MM-dd HH:mm'),
      Resolved: resolvedAt(r) ? format(new Date(resolvedAt(r) as string), 'yyyy-MM-dd HH:mm') : '',
      'Turnaround (hrs)': turnaroundHours(r) !== null ? Math.round((turnaroundHours(r) as number) * 10) / 10 : '',
      'Ticket ID': r.controlhub_ticket_id || '',
      'Ticket URL': r.controlhub_ticket_url || '',
      'Patient Link': r.patient_link || '',
    }));

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const summary = [
      { Metric: 'Date range', Value: `${format(dateFrom, 'MMM d, yyyy')} – ${format(dateTo, 'MMM d, yyyy')}` },
      { Metric: 'Total cases', Value: filtered.length },
      { Metric: 'Completed audits', Value: completed.length },
      { Metric: 'Still open', Value: open },
      { Metric: 'Errors found', Value: errors.length },
      { Metric: 'Error rate', Value: pct(errors.length, filtered.length) },
      { Metric: 'Average turnaround', Value: humanizeHours(avg(turnarounds)) },
      { Metric: 'Caught before clinic', Value: pct(caughtBefore, errors.length) },
      { Metric: 'Tickets created', Value: ticketsCreated },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        byClinic.map((g) => ({
          Clinic: g.key,
          Cases: g.total,
          Errors: g.errors,
          'Error Rate': pct(g.errors, g.total),
          'Avg Turnaround': humanizeHours(avg(g.ta)),
          'Caught Before Clinic': pct(g.caught, g.errors),
        })),
      ),
      'By Clinic',
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        byQa.map((g) => ({
          'QA Specialist': g.key,
          Cases: g.total,
          Errors: g.errors,
          'Error Rate': pct(g.errors, g.total),
          'Avg Turnaround': humanizeHours(avg(g.ta)),
          'Tickets Created': g.tickets,
        })),
      ),
      'By QA',
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        byCategory.map((c) => ({
          'Error Category': c.key,
          Count: c.count,
          '% of Errors': pct(c.count, errors.length),
          'Top Clinics': c.clinics,
        })),
      ),
      'By Error Category',
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        bySource.map((c) => ({ 'Error Source': c.key, Count: c.count, '% of Errors': pct(c.count, errors.length) })),
      ),
      'By Error Source',
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        byResolution.map((c) => ({ Resolution: c.key, Count: c.count, '% of Cases': pct(c.count, filtered.length) })),
      ),
      'By Resolution',
    );

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawRows()), 'Raw Cases');

    XLSX.writeFile(wb, `qa-audit-report_${stamp}.xlsx`);
    toast({ title: 'Report exported', description: `${filtered.length} cases included.` });
  };

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(rawRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-audit-cases_${stamp}.csv`;
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

  const metricCards = [
    { label: 'Total cases', value: String(filtered.length), hint: `${open} still open` },
    { label: 'Completed audits', value: String(completed.length) },
    { label: 'Errors found', value: String(errors.length), hint: `${pct(errors.length, filtered.length)} of cases` },
    { label: 'Avg turnaround', value: humanizeHours(avg(turnarounds)), hint: `${turnarounds.length} resolved` },
    { label: 'Caught before clinic', value: pct(caughtBefore, errors.length) },
    { label: 'Tickets created', value: String(ticketsCreated) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">QA Audit Report</h3>
          <p className="text-sm text-muted-foreground">
            Team-wide audit errors, turnaround, and training insights.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={cn('h-3 w-3 mr-1', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={exportExcel} disabled={!filtered.length}>
            <Download className="h-3 w-3 mr-1" /> Export to Excel
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DatePick value={dateFrom} onChange={setDateFrom} label="From" />
        <DatePick value={dateTo} onChange={setDateTo} label="To" />
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Clinic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clinics</SelectItem>
            {projects.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={qaFilter} onValueChange={setQaFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="QA specialist" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All QA specialists</SelectItem>
            {qaNames.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={alertFilter} onValueChange={setAlertFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Alert type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All alert types</SelectItem>
            {Object.entries(ALERT_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Error category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All error categories</SelectItem>
            {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
        </div>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {metricCards.map((m) => (
              <Card key={m.label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-2xl font-semibold">{m.value}</p>
                  {m.hint && <p className="text-xs text-muted-foreground mt-1">{m.hint}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Errors per week</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <ReTooltip />
                  <Bar dataKey="audits" name="Cases" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="errors" name="Errors" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">By clinic</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clinic</TableHead>
                      <TableHead className="text-right">Cases</TableHead>
                      <TableHead className="text-right">Errors</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Avg TAT</TableHead>
                      <TableHead className="text-right">Caught</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byClinic.map((g) => (
                      <TableRow key={g.key}>
                        <TableCell className="font-medium">{g.key}</TableCell>
                        <TableCell className="text-right">{g.total}</TableCell>
                        <TableCell className="text-right">{g.errors}</TableCell>
                        <TableCell className="text-right">{pct(g.errors, g.total)}</TableCell>
                        <TableCell className="text-right">{humanizeHours(avg(g.ta))}</TableCell>
                        <TableCell className="text-right">{pct(g.caught, g.errors)}</TableCell>
                      </TableRow>
                    ))}
                    {!byClinic.length && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">By QA specialist</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>QA</TableHead>
                      <TableHead className="text-right">Cases</TableHead>
                      <TableHead className="text-right">Errors</TableHead>
                      <TableHead className="text-right">Avg TAT</TableHead>
                      <TableHead className="text-right">Tickets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byQa.map((g) => (
                      <TableRow key={g.key}>
                        <TableCell className="font-medium">{g.key}</TableCell>
                        <TableCell className="text-right">{g.total}</TableCell>
                        <TableCell className="text-right">{g.errors}</TableCell>
                        <TableCell className="text-right">{humanizeHours(avg(g.ta))}</TableCell>
                        <TableCell className="text-right">{g.tickets}</TableCell>
                      </TableRow>
                    ))}
                    {!byQa.length && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">By error category (training view)</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">% of errors</TableHead>
                      <TableHead>Top clinics</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byCategory.map((c) => (
                      <TableRow key={c.key}>
                        <TableCell className="font-medium">{c.key}</TableCell>
                        <TableCell className="text-right">{c.count}</TableCell>
                        <TableCell className="text-right">{pct(c.count, errors.length)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.clinics}</TableCell>
                      </TableRow>
                    ))}
                    {!byCategory.length && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No errors recorded</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">By error source</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">% of errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bySource.map((c) => (
                        <TableRow key={c.key}>
                          <TableCell className="font-medium">{c.key}</TableCell>
                          <TableCell className="text-right">{c.count}</TableCell>
                          <TableCell className="text-right">{pct(c.count, errors.length)}</TableCell>
                        </TableRow>
                      ))}
                      {!bySource.length && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">By resolution</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resolution</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">% of cases</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byResolution.map((c) => (
                        <TableRow key={c.key}>
                          <TableCell className="font-medium">{c.key}</TableCell>
                          <TableCell className="text-right">{c.count}</TableCell>
                          <TableCell className="text-right">{pct(c.count, filtered.length)}</TableCell>
                        </TableRow>
                      ))}
                      {!byResolution.length && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
