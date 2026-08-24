import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Download, Loader2, PhoneCall } from 'lucide-react';
import { formatInCentralTime } from '@/utils/dateTimeUtils';
import * as XLSX from 'xlsx';

interface ApptRow {
  id: string;
  lead_name: string | null;
  project_name: string | null;
  date_of_appointment: string | null;
  status: string | null;
  welcome_call_state: string | null;
  welcome_call_attempt_count: number | null;
  welcome_call_first_attempt_at: string | null;
  welcome_call_last_attempt_at: string | null;
  welcome_call_reached_at: string | null;
}

interface AttemptRow {
  appointment_id: string;
  attempted_at: string;
  outcome: string;
  user_name: string | null;
}

const stateLabel = (s: string | null) =>
  s === 'reached' ? 'Successfully Reached'
    : s === 'attempted' ? 'Attempted – Not Reached'
    : 'No Attempt Logged';

const WelcomeCallReport = () => {
  const [rows, setRows] = useState<ApptRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from('all_appointments')
        .select('id, lead_name, project_name, date_of_appointment, status, welcome_call_state, welcome_call_attempt_count, welcome_call_first_attempt_at, welcome_call_last_attempt_at, welcome_call_reached_at')
        .not('date_of_appointment', 'is', null)
        .or('is_superseded.is.null,is_superseded.eq.false')
        .order('date_of_appointment', { ascending: false })
        .limit(2000);
      if (from) q = q.gte('date_of_appointment', from);
      if (to) q = q.lte('date_of_appointment', to);

      const { data, error } = await q;
      if (error) console.error('Failed to load welcome call report:', error);
      const apptRows = ((data as any) || []) as ApptRow[];
      setRows(apptRows);

      const withAttempts = apptRows.filter(r => (r.welcome_call_attempt_count || 0) > 0).map(r => r.id);
      const collected: AttemptRow[] = [];
      for (let i = 0; i < withAttempts.length; i += 200) {
        const chunk = withAttempts.slice(i, i + 200);
        const { data: att } = await supabase
          .from('appointment_contact_attempts')
          .select('appointment_id, attempted_at, outcome, user_name')
          .eq('source', 'welcome_call')
          .in('appointment_id', chunk);
        collected.push(...(((att as any) || []) as AttemptRow[]));
      }
      setAttempts(collected);
      setLoading(false);
    };
    load();
  }, [from, to]);

  const projects = useMemo(
    () => Array.from(new Set(rows.map(r => r.project_name).filter(Boolean))).sort() as string[],
    [rows],
  );

  const filtered = useMemo(
    () => (projectFilter === 'ALL' ? rows : rows.filter(r => r.project_name === projectFilter)),
    [rows, projectFilter],
  );

  const total = filtered.length;
  const reached = filtered.filter(r => r.welcome_call_state === 'reached').length;
  const attempted = filtered.filter(r => r.welcome_call_state === 'attempted').length;
  const none = total - reached - attempted;
  const withAny = reached + attempted;
  const attemptRate = total ? Math.round((withAny / total) * 100) : 0;
  const contactRate = total ? Math.round((reached / total) * 100) : 0;
  const totalAttempts = filtered.reduce((a, r) => a + (r.welcome_call_attempt_count || 0), 0);
  const avgAttempts = withAny ? (totalAttempts / withAny).toFixed(1) : '0.0';

  const filteredIds = useMemo(() => new Set(filtered.map(r => r.id)), [filtered]);
  const byUser = useMemo(() => {
    const map = new Map<string, { attempts: number; answered: number; last: string | null }>();
    attempts
      .filter(a => filteredIds.has(a.appointment_id))
      .forEach(a => {
        const key = a.user_name || 'Unknown';
        const cur = map.get(key) || { attempts: 0, answered: 0, last: null };
        cur.attempts += 1;
        if (a.outcome === 'answered') cur.answered += 1;
        if (!cur.last || new Date(a.attempted_at) > new Date(cur.last)) cur.last = a.attempted_at;
        map.set(key, cur);
      });
    return Array.from(map.entries()).sort((a, b) => b[1].attempts - a[1].attempts);
  }, [attempts, filteredIds]);

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(
      filtered.map(r => ({
        Patient: r.lead_name || '',
        Clinic: r.project_name || '',
        'Appointment Date': r.date_of_appointment || '',
        'Appointment Status': r.status || '',
        'Welcome Call State': stateLabel(r.welcome_call_state),
        Attempts: r.welcome_call_attempt_count || 0,
        'First Attempt': r.welcome_call_first_attempt_at ? formatInCentralTime(r.welcome_call_first_attempt_at, 'MM/dd/yyyy hh:mm a') : '',
        'Last Attempt': r.welcome_call_last_attempt_at ? formatInCentralTime(r.welcome_call_last_attempt_at, 'MM/dd/yyyy hh:mm a') : '',
        'Reached At': r.welcome_call_reached_at ? formatInCentralTime(r.welcome_call_reached_at, 'MM/dd/yyyy hh:mm a') : '',
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Welcome Calls');
    XLSX.writeFile(wb, `welcome-calls-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-base">
          <PhoneCall className="h-4 w-4" /> Welcome Calls
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-9 w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All clinics</SelectItem>
              {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              {[
                ['Appointments', total],
                ['With attempt', withAny],
                ['No attempt', none],
                ['Not reached', attempted],
                ['Reached', reached],
                ['Attempt rate', `${attemptRate}%`],
                ['Contact rate', `${contactRate}%`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-xl font-semibold">{value}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Average attempts per contacted patient: <span className="font-medium">{avgAttempts}</span>
            </div>

            {byUser.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Attempts by user</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Answered</TableHead>
                      <TableHead>Last attempt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byUser.map(([name, s]) => (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell>{s.attempts}</TableCell>
                        <TableCell>{s.answered}</TableCell>
                        <TableCell>{s.last ? formatInCentralTime(s.last, 'MM/dd/yyyy hh:mm a') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-2">Appointments ({filtered.length})</div>
              <div className="max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Clinic</TableHead>
                      <TableHead>Appt date</TableHead>
                      <TableHead>Welcome Call</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Last attempt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 300).map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <a
                            className="text-primary hover:underline"
                            href={`/?appointment=${r.id}`}
                          >
                            {r.lead_name || 'Unknown'}
                          </a>
                        </TableCell>
                        <TableCell className="text-xs">{r.project_name}</TableCell>
                        <TableCell className="text-xs">{r.date_of_appointment}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              r.welcome_call_state === 'reached'
                                ? 'bg-emerald-100 text-emerald-700'
                                : r.welcome_call_state === 'attempted'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {stateLabel(r.welcome_call_state)}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.welcome_call_attempt_count || 0}</TableCell>
                        <TableCell className="text-xs">
                          {r.welcome_call_last_attempt_at
                            ? formatInCentralTime(r.welcome_call_last_attempt_at, 'MM/dd/yyyy hh:mm a')
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WelcomeCallReport;
