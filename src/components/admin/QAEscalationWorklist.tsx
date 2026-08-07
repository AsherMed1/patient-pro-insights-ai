import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, RefreshCw, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ESCALATION_STATUSES, ESCALATION_TYPES, escalationStatusClass,
  daysOutstanding, agingClass,
} from '@/lib/qaEscalation';

const ALERT_LABELS: Record<string, string> = {
  short_notice: 'Short Notice',
  oon: 'OON',
  confirmed_audit: 'Confirmed Audit',
  review_queue: 'Review Queue',
  no_show: 'No-Show',
  cancelled: 'Cancellation',
};

const WORKFLOW_LABELS: Record<string, string> = {
  new: 'New',
  in_review: 'Opened',
  pending_escalated: 'Pending / Escalated',
  completed: 'Completed',
  reopened: 'Reopened',
};

interface Row {
  id: string;
  patient_name: string | null;
  project_name: string | null;
  alert_type: string | null;
  workflow_status: string;
  resolution_type: string | null;
  escalation_status: string | null;
  escalation_owner_user_id: string | null;
  escalated_by_user_id: string | null;
  escalated_at: string | null;
  controlhub_ticket_id: string | null;
  controlhub_ticket_status: string | null;
  controlhub_ticket_url: string | null;
  completed_at: string | null;
  latest_note?: string | null;
}

interface Props {
  onOpenCase: (row: any) => void;
  currentUserId?: string | null;
}

export default function QAEscalationWorklist({ onOpenCase, currentUserId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('qa_cases' as any)
      .select(
        'id, patient_name, project_name, alert_type, workflow_status, resolution_type, escalation_status, escalation_owner_user_id, escalated_by_user_id, escalated_at, controlhub_ticket_id, controlhub_ticket_status, controlhub_ticket_url, completed_at',
      )
      .not('escalated_at', 'is', null)
      .order('escalated_at', { ascending: false })
      .limit(1000);

    const list = ((data as any[]) || []) as Row[];

    // Latest note per case.
    const ids = list.map((r) => r.id);
    if (ids.length) {
      const { data: notes } = await supabase
        .from('qa_case_notes' as any)
        .select('case_id, note, created_at')
        .in('case_id', ids)
        .order('created_at', { ascending: false });
      const latest = new Map<string, string>();
      for (const n of ((notes as any[]) || [])) {
        if (!latest.has(n.case_id)) latest.set(n.case_id, n.note);
      }
      list.forEach((r) => { r.latest_note = latest.get(r.id) ?? null; });
    }

    const userIds = [
      ...new Set(
        list.flatMap((r) => [r.escalation_owner_user_id, r.escalated_by_user_id]).filter(Boolean),
      ),
    ] as string[];
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      const map: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { map[p.id] = p.full_name || p.email; });
      setNames(map);
    }

    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const owners = useMemo(
    () => [...new Set(rows.map((r) => r.escalation_owner_user_id).filter(Boolean))] as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === 'open') {
        if (r.escalation_status === 'Resolved' || r.workflow_status === 'completed') return false;
      } else if (statusFilter !== 'all' && r.escalation_status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.resolution_type !== typeFilter) return false;
      if (ownerFilter === 'mine' && r.escalation_owner_user_id !== currentUserId) return false;
      if (ownerFilter === 'unassigned' && r.escalation_owner_user_id) return false;
      if (ownerFilter !== 'all' && ownerFilter !== 'mine' && ownerFilter !== 'unassigned'
        && r.escalation_owner_user_id !== ownerFilter) return false;
      if (q) {
        const hay = [
          r.patient_name, r.project_name, r.resolution_type, r.escalation_status,
          r.controlhub_ticket_id, names[r.escalation_owner_user_id || ''],
          names[r.escalated_by_user_id || ''], r.latest_note,
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, typeFilter, ownerFilter, currentUserId, names]);

  const hasFilter =
    !!search || ownerFilter !== 'all' || statusFilter !== 'open' || typeFilter !== 'all';

  const exportCsv = () => {
    const header = [
      'Patient', 'Clinic', 'Alert Type', 'Escalation Type', 'Workflow Status',
      'Escalation Status', 'Assigned Owner', 'Escalated By', 'Date Escalated',
      'Latest Note', 'Ticket', 'Ticket Status', 'Days Outstanding',
    ];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = filtered.map((r) => [
      r.patient_name, r.project_name, ALERT_LABELS[r.alert_type || ''] || r.alert_type,
      r.resolution_type, WORKFLOW_LABELS[r.workflow_status] || r.workflow_status,
      r.escalation_status, names[r.escalation_owner_user_id || ''] || '',
      names[r.escalated_by_user_id || ''] || '',
      r.escalated_at ? format(new Date(r.escalated_at), 'yyyy-MM-dd HH:mm') : '',
      (r.latest_note || '').replace(/\s+/g, ' ').slice(0, 300),
      r.controlhub_ticket_id || '', r.controlhub_ticket_status || '',
      daysOutstanding(r.escalated_at) ?? '',
    ].map(esc).join(','));
    const blob = new Blob([[header.map(esc).join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-escalations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search patient, clinic, owner, note, ticket…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open escalations</SelectItem>
            <SelectItem value="all">All escalation statuses</SelectItem>
            {ESCALATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Escalation type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All escalation types</SelectItem>
            {ESCALATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Owner" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            <SelectItem value="mine">Assigned to me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {owners.map((o) => (
              <SelectItem key={o} value={o}>{names[o] || 'Unknown'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => {
              setSearch('');
              setOwnerFilter('all');
              setStatusFilter('open');
              setTypeFilter('all');
            }}
          >
            <X className="h-3 w-3" /> Clear all filters
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{filtered.length} escalations</span>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No escalations match these filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient / Clinic</TableHead>
                    <TableHead>Alert</TableHead>
                    <TableHead>Escalation Type</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Escalation Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Escalated By</TableHead>
                    <TableHead>Escalated</TableHead>
                    <TableHead>Latest Note</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead className="text-right">Days Out</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const days = daysOutstanding(r.escalated_at);
                    const resolved =
                      r.escalation_status === 'Resolved' || r.workflow_status === 'completed';
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate font-medium">{r.patient_name || '—'}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {r.project_name || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {ALERT_LABELS[r.alert_type || ''] || r.alert_type || '—'}
                        </TableCell>
                        <TableCell className="text-xs">{r.resolution_type || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {WORKFLOW_LABELS[r.workflow_status] || r.workflow_status}
                        </TableCell>
                        <TableCell>
                          {r.escalation_status ? (
                            <Badge variant="outline" className={escalationStatusClass(r.escalation_status)}>
                              {r.escalation_status}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {names[r.escalation_owner_user_id || ''] || 'Unassigned'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {names[r.escalated_by_user_id || ''] || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {r.escalated_at ? format(new Date(r.escalated_at), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="max-w-[240px]">
                          <div className="line-clamp-2 text-xs text-muted-foreground">
                            {r.latest_note || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.controlhub_ticket_id ? (
                            <div className="space-y-0.5">
                              {r.controlhub_ticket_url ? (
                                <a
                                  href={r.controlhub_ticket_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline"
                                >
                                  {r.controlhub_ticket_id}
                                </a>
                              ) : (
                                <span>{r.controlhub_ticket_id}</span>
                              )}
                              {r.controlhub_ticket_status && (
                                <div className="text-muted-foreground">
                                  {r.controlhub_ticket_status.replace(/_/g, ' ')}
                                </div>
                              )}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className={cn('text-right text-xs', !resolved && agingClass(days))}>
                          {resolved ? '—' : days ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => onOpenCase(r)}>
                            Open
                          </Button>
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
    </div>
  );
}
