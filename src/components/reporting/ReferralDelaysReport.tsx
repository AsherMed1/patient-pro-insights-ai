import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileText, Loader2 } from 'lucide-react';
import { REFERRAL_STAGE_LABELS, referralWaitDays, type ReferralStage } from '@/lib/referralStatus';
import * as XLSX from 'xlsx';

interface ReferralRow {
  id: string;
  lead_name: string | null;
  project_name: string | null;
  lead_phone_number: string | null;
  status: string | null;
  referral_status: string | null;
  referral_requested_at: string | null;
  calendar_name: string | null;
}

const ReferralDelaysReport = () => {
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('ALL');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('all_appointments')
        .select('id, lead_name, project_name, lead_phone_number, status, referral_status, referral_requested_at, calendar_name')
        .not('referral_requested_at', 'is', null)
        .or('is_superseded.is.null,is_superseded.eq.false')
        .order('referral_requested_at', { ascending: true })
        .limit(1000);
      if (error) console.error('Failed to load referral report:', error);
      setRows((data as any) || []);
      setLoading(false);
    };
    load();
  }, []);

  const projects = useMemo(
    () => Array.from(new Set(rows.map((r) => r.project_name).filter(Boolean))).sort() as string[],
    [rows],
  );

  const filtered = useMemo(
    () => (projectFilter === 'ALL' ? rows : rows.filter((r) => r.project_name === projectFilter)),
    [rows, projectFilter],
  );

  const awaiting = filtered.filter((r) => (r.referral_status || '') === 'requested');
  const waits = awaiting.map((r) => referralWaitDays(r.referral_requested_at) ?? 0);
  const avgWait = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;
  const over14 = waits.filter((d) => d >= 14).length;

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        Patient: r.lead_name || '',
        Project: r.project_name || '',
        Phone: r.lead_phone_number || '',
        Location: r.calendar_name || '',
        'Referral Stage': REFERRAL_STAGE_LABELS[(r.referral_status as ReferralStage) || 'requested'] || r.referral_status || '',
        'Requested At': r.referral_requested_at ? new Date(r.referral_requested_at).toLocaleString() : '',
        'Days Waiting': referralWaitDays(r.referral_requested_at) ?? '',
        'Portal Status': r.status || '',
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Referral Delays');
    XLSX.writeFile(wb, `referral-delays-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-600" />
          Referral Delays
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-56 h-9">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="ALL">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Awaiting referral</p>
            <p className="text-2xl font-semibold">{awaiting.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Average wait</p>
            <p className="text-2xl font-semibold">{avgWait} days</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Waiting 14+ days</p>
            <p className="text-2xl font-semibold text-amber-700">{over14}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading referrals…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No referral requests recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Days waiting</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const days = referralWaitDays(r.referral_requested_at);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.lead_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.project_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.referral_status === 'requested' ? 'referralRequested' : 'secondary'}>
                          {REFERRAL_STAGE_LABELS[(r.referral_status as ReferralStage) || 'cleared'] ||
                            r.referral_status ||
                            'Cleared'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.referral_requested_at
                          ? new Date(r.referral_requested_at).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={days !== null && days >= 14 ? 'text-amber-700 font-semibold' : ''}>
                          {days ?? '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralDelaysReport;
