import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Check, X, AlertTriangle, RefreshCw, Search, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserAttribution } from '@/hooks/useUserAttribution';
import DetailedAppointmentView from '@/components/appointments/DetailedAppointmentView';
import type { AllAppointment } from '@/components/appointments/types';
import { formatDate, formatTime } from '@/components/appointments/utils';

interface ReviewAppointment {
  id: string;
  lead_name: string;
  lead_phone_number: string | null;
  lead_email: string | null;
  project_name: string;
  calendar_name: string | null;
  date_of_appointment: string | null;
  requested_time: string | null;
  date_appointment_created: string;
  status: string | null;
  patient_intake_notes: string | null;
  parsed_pathology_info: any;
  parsed_insurance_info: any;
  parsed_demographics: any;
  dob: string | null;
  ghl_id: string | null;
  review_status: string;
  created_at: string;
}

type ActionType = 'approved' | 'declined' | 'oon';
type SortKey = 'patient' | 'project' | 'service' | 'appointment';
type SortDir = 'asc' | 'desc';

const ReviewQueue: React.FC = () => {
  const { toast } = useToast();
  const { userName } = useUserAttribution();
  const [rows, setRows] = useState<ReviewAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionRow, setActionRow] = useState<{ id: string; action: ActionType } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [detailAppt, setDetailAppt] = useState<AllAppointment | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const dir = sortDir === 'asc' ? 1 : -1;
    const getVal = (r: ReviewAppointment): string | number => {
      switch (sortKey) {
        case 'patient':
          return (r.lead_name || '').toLowerCase();
        case 'project':
          return (r.project_name || '').toLowerCase();
        case 'service': {
          const proc = (r.parsed_pathology_info?.procedure_type || '').toString().toLowerCase();
          const cal = (r.calendar_name || '').toLowerCase();
          return `${proc}|${cal}`;
        }
        case 'appointment': {
          if (!r.date_of_appointment) return Number.POSITIVE_INFINITY;
          const t = r.requested_time || '00:00:00';
          return new Date(`${r.date_of_appointment}T${t}`).getTime() || Number.POSITIVE_INFINITY;
        }
      }
    };
    return [...rows].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    });
  }, [rows, sortKey, sortDir]);


  const openDetail = async (id: string) => {
    setDetailLoading(id);
    const { data, error } = await supabase
      .from('all_appointments')
      .select('*')
      .eq('id', id)
      .single();
    setDetailLoading(null);
    if (error || !data) {
      toast({ title: 'Could not load appointment', description: error?.message, variant: 'destructive' });
      return;
    }
    setDetailAppt(data as unknown as AllAppointment);
  };

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('all_appointments')
      .select('id, lead_name, lead_phone_number, lead_email, project_name, calendar_name, date_of_appointment, requested_time, date_appointment_created, status, patient_intake_notes, parsed_pathology_info, parsed_insurance_info, parsed_demographics, dob, ghl_id, review_status, created_at')
      .eq('review_status', 'pending')
      .or('is_reserved_block.is.null,is_reserved_block.eq.false')
      .not('project_name', 'in', '("ECCO Medical","Premier Vascular","Premier Vascular Surgery")')
      .order('created_at', { ascending: false })
      .limit(500);

    if (projectFilter !== 'ALL') q = q.eq('project_name', projectFilter);
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`lead_name.ilike.%${s}%,lead_phone_number.ilike.%${s}%,lead_email.ilike.%${s}%`);
    }

    const { data, error } = await q;
    if (error) {
      toast({ title: 'Error loading queue', description: error.message, variant: 'destructive' });
      setRows([]);
    } else {
      setRows((data || []) as ReviewAppointment[]);
    }
    setLoading(false);
  }, [projectFilter, search, toast]);

  useEffect(() => {
    fetch();
    const i = setInterval(fetch, 30000);
    return () => clearInterval(i);
  }, [fetch]);

  const projects = Array.from(new Set(rows.map(r => r.project_name))).sort();

  const performAction = async (id: string, action: ActionType, notes?: string) => {
    setProcessing(true);
    try {
      const { data: priorRow } = await supabase
        .from('all_appointments')
        .select('review_status, lead_name, lead_phone_number, calendar_name, project_name, status, ghl_id')
        .eq('id', id)
        .single();

      const update: any = {
        review_status: action,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      };
      const { data: { user } } = await supabase.auth.getUser();
      if (user) update.reviewed_by = user.id;

      if (action === 'oon') {
        update.status = 'OON';
        update.internal_process_complete = true;
        update.procedure_ordered = false;
      }

      const { error: updErr } = await supabase
        .from('all_appointments')
        .update(update)
        .eq('id', id);
      if (updErr) throw updErr;

      await supabase.from('appointment_review_history').insert({
        appointment_id: id,
        action,
        prior_status: priorRow?.review_status ?? null,
        actor_id: user?.id ?? null,
        actor_name: userName || user?.email || 'Unknown',
        notes: notes || null,
      });

      // Audit log
      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment',
          p_action: `review_${action}`,
          p_description: `${action === 'oon' ? 'Marked as OON' : action === 'approved' ? 'Approved' : 'Declined'}: ${priorRow?.lead_name ?? id} by ${userName || 'Unknown'}`,
          p_source: 'review_queue',
          p_metadata: { appointment_id: id, project_name: priorRow?.project_name, notes: notes || null },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      // Approved side effect: add 'approved' tag to GHL contact
      if (action === 'approved') {
        if (!priorRow?.ghl_id) {
          console.warn('Approve: no ghl_id on appointment; skipping GHL tag');
          toast({
            title: 'Approved — GHL tag skipped',
            description: 'This appointment has no linked GHL contact, so the "approved" tag was not added.',
          });
        } else {
          try {
            // Look up the project's GHL API key so we hit the correct sub-account
            const { data: projectData } = await supabase
              .from('projects')
              .select('ghl_api_key')
              .eq('project_name', priorRow.project_name)
              .maybeSingle();

            const { data: tagData, error: tagErr } = await supabase.functions.invoke('update-ghl-contact-tags', {
              body: {
                ghl_contact_id: priorRow.ghl_id,
                ghl_api_key: projectData?.ghl_api_key || undefined,
                tags: ['approved'],
                action: 'add',
              },
            });
            console.log('update-ghl-contact-tags response:', { tagData, tagErr });
            if (tagErr) {
              console.error('update-ghl-contact-tags failed:', tagErr);
              toast({
                title: 'Approved, but GHL tag not added',
                description: 'Review status was saved, but adding the "approved" tag in GHL failed.',
                variant: 'destructive',
              });
            }
          } catch (err) {
            console.error('update-ghl-contact-tags threw:', err);
            toast({
              title: 'Approved, but GHL tag not added',
              description: (err as Error)?.message || 'Unknown error invoking GHL tag function.',
              variant: 'destructive',
            });
          }
        }
      }

      // OON side effects: mirror the appointment-card dropdown path so the
      // GHL OON workflow runs and the Slack alert fires.
      if (action === 'oon' && priorRow) {
        const oldStatus = priorRow.status || 'Pending';
        const utcTimestamp = new Date().toISOString();

        // System note for status-change audit trail
        try {
          await supabase.from('appointment_notes').insert({
            appointment_id: id,
            note_text: `Status changed from "${oldStatus}" to "OON" by ${userName || 'Review Queue'} - [[timestamp:${utcTimestamp}]]`,
            created_by: userName || 'Review Queue',
          });
        } catch (e) {
          console.warn('System note insert failed', e);
        }

        // Outbound status webhook -> triggers GHL OON workflow (awaited; surface failures)
        try {
          const { data: whData, error: whErr } = await supabase.functions.invoke('appointment-status-webhook', {
            body: {
              appointment_id: id,
              old_status: oldStatus,
              new_status: 'OON',
            },
          });
          if (whErr || (whData && whData.success === false)) {
            console.error('appointment-status-webhook failed:', whErr || whData);
            toast({
              title: 'OON saved, but GHL workflow did not fire',
              description: 'Status was updated, but the outbound webhook to GHL failed. Contact engineering.',
              variant: 'destructive',
            });
          }
        } catch (err) {
          console.error('appointment-status-webhook threw:', err);
          toast({
            title: 'OON saved, but GHL workflow did not fire',
            description: 'The outbound webhook to GHL threw an error. Contact engineering.',
            variant: 'destructive',
          });
        }

        // Slack OON alert (awaited; surface failures)
        try {
          const nameParts = (priorRow.lead_name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          const { error: slackErr } = await supabase.functions.invoke('notify-slack-oon', {
            body: {
              firstName,
              lastName,
              phone: priorRow.lead_phone_number || '',
              calendarName: priorRow.calendar_name || '',
              projectName: priorRow.project_name,
              appointmentId: id,
            },
          });
          if (slackErr) {
            console.error('notify-slack-oon failed:', slackErr);
            toast({
              title: 'Slack OON alert failed',
              description: 'OON status was saved, but the Slack alert did not deliver. The webhook URL may be stale.',
              variant: 'destructive',
            });
          }
        } catch (err) {
          console.error('notify-slack-oon threw:', err);
          toast({
            title: 'Slack OON alert failed',
            description: 'OON status was saved, but the Slack alert threw an error.',
            variant: 'destructive',
          });
        }
      }
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' });
      setProcessing(false);
      return false;
    }
    setProcessing(false);
    return true;
  };

  const handleSingleAction = async (id: string, action: ActionType, notes?: string) => {
    const ok = await performAction(id, action, notes);
    if (ok) {
      toast({ title: `Appointment ${action === 'oon' ? 'marked as OON' : action}` });
      setRows(prev => prev.filter(r => r.id !== id));
      setActionRow(null);
      setActionNotes('');
    }
  };

  const handleBulk = async (action: ActionType) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    let ok = 0;
    for (const id of ids) {
      const success = await performAction(id, action);
      if (success) ok++;
    }
    toast({ title: `${ok} of ${ids.length} ${action === 'oon' ? 'marked OON' : action}` });
    setRows(prev => prev.filter(r => !selected.has(r.id)));
    setSelected(new Set());
  };

  const toggleExpand = (id: string) =>
    setExpanded(e => ({ ...e, [id]: !e[id] }));

  const toggleSelect = (id: string) => {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              Review Queue
              <Badge variant="secondary">{rows.length} pending</Badge>
            </CardTitle>
            <CardDescription>
              New appointments wait here until you Approve, Decline, or mark them as OON. Client portals only see appointments that have been Approved (or marked OON).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All projects</SelectItem>
              {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
            <span className="text-sm font-medium mr-2">{selected.size} selected</span>
            <Button size="sm" variant="default" onClick={() => handleBulk('approved')} disabled={processing}>
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleBulk('declined')} disabled={processing}>
              <X className="h-4 w-4 mr-1" /> Decline
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            🎉 No appointments waiting for review.
          </div>
        ) : (
          <div className="border rounded-md divide-y">
            <div className="grid grid-cols-[28px_minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(220px,1.6fr)_minmax(120px,0.9fr)_300px] gap-3 p-3 text-xs font-medium text-muted-foreground bg-muted/40 items-center">
              <input
                type="checkbox"
                checked={selected.size === rows.length && rows.length > 0}
                onChange={selectAll}
                className="cursor-pointer"
              />
              <button onClick={() => toggleSort('patient')} className="flex items-center gap-1 text-left hover:text-foreground transition-colors">
                Patient <SortIcon k="patient" />
              </button>
              <button onClick={() => toggleSort('project')} className="flex items-center gap-1 text-left hover:text-foreground transition-colors">
                Project <SortIcon k="project" />
              </button>
              <button onClick={() => toggleSort('service')} className="flex items-center gap-1 text-left hover:text-foreground transition-colors">
                Service / Calendar <SortIcon k="service" />
              </button>
              <button onClick={() => toggleSort('appointment')} className="flex items-center gap-1 text-left hover:text-foreground transition-colors">
                Appointment <SortIcon k="appointment" />
              </button>
              <div className="text-right">Actions</div>
            </div>
            {sortedRows.map(row => {
              const isOpen = expanded[row.id];
              const path = row.parsed_pathology_info || {};
              const ins = row.parsed_insurance_info || {};
              const demo = row.parsed_demographics || {};
              return (
                <div key={row.id} className="hover:bg-muted/20">
                  <div className="grid grid-cols-[28px_minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(220px,1.6fr)_minmax(120px,0.9fr)_300px] gap-3 p-3 items-center text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleExpand(row.id)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Toggle inline details"
                        >
                          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => openDetail(row.id)}
                          className="font-medium hover:underline text-left text-primary"
                          disabled={detailLoading === row.id}
                        >
                          {row.lead_name}{detailLoading === row.id ? '…' : ''}
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground">{row.lead_phone_number || '—'}</div>
                    </div>
                    <div className="text-xs">{row.project_name}</div>
                    <div className="text-xs">
                      <div>{path.procedure_type || '—'}</div>
                      <div className="text-muted-foreground truncate">{row.calendar_name || '—'}</div>
                    </div>
                    <div className="text-xs">
                      <div>{formatDate(row.date_of_appointment)}</div>
                      <div className="text-muted-foreground">{formatTime(row.requested_time)}</div>
                    </div>
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleSingleAction(row.id, 'approved')}
                        disabled={processing}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        onClick={() => { setActionRow({ id: row.id, action: 'oon' }); setActionNotes(''); }}
                        disabled={processing}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" /> OON
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { setActionRow({ id: row.id, action: 'declined' }); setActionNotes(''); }}
                        disabled={processing}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-4 pt-1 bg-muted/10 text-xs space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <div className="font-medium text-muted-foreground">Email</div>
                          <div>{row.lead_email || '—'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground">DOB</div>
                          <div>{row.dob || demo.dob || '—'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground">Location</div>
                          <div>{path.location || '—'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground">Insurance</div>
                          <div>{ins.provider || ins.plan || '—'}</div>
                        </div>
                      </div>
                      {row.patient_intake_notes && (
                        <div>
                          <div className="font-medium text-muted-foreground mb-1">Intake notes</div>
                          <div className="whitespace-pre-wrap bg-background p-2 rounded border max-h-64 overflow-auto">
                            {row.patient_intake_notes.split('OpenAI Prompt:')[0]}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Confirm dialog for Decline / OON with notes */}
        <Dialog open={!!actionRow} onOpenChange={(o) => { if (!o) { setActionRow(null); setActionNotes(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionRow?.action === 'oon' ? 'Mark as OON' : 'Decline appointment'}
              </DialogTitle>
              <DialogDescription>
                {actionRow?.action === 'oon'
                  ? 'Sets status to OON, releases the appointment to the project portal, and fires the OON Slack alert.'
                  : 'Hides this appointment from the client portal and reports. The record stays in the database for audit.'}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder={actionRow?.action === 'oon' ? 'Optional note…' : 'Reason (duplicate, spam, wrong project, test, other)…'}
              value={actionNotes}
              onChange={e => setActionNotes(e.target.value)}
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setActionRow(null); setActionNotes(''); }}>Cancel</Button>
              <Button
                variant={actionRow?.action === 'oon' ? 'default' : 'destructive'}
                onClick={() => actionRow && handleSingleAction(actionRow.id, actionRow.action, actionNotes)}
                disabled={processing}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {detailAppt && (
          <DetailedAppointmentView
            appointment={detailAppt}
            isOpen={!!detailAppt}
            onClose={() => setDetailAppt(null)}
            onDataRefresh={async () => {
              fetch();
              // Re-fetch the open appointment so edits made inside the
              // modal (insurance, PCP, demographics, etc.) appear
              // immediately instead of showing the pre-edit snapshot.
              if (detailAppt?.id) {
                const { data } = await supabase
                  .from('all_appointments')
                  .select('*')
                  .eq('id', detailAppt.id)
                  .single();
                if (data) setDetailAppt(data as unknown as AllAppointment);
              }
            }}
            onDeleted={() => { setDetailAppt(null); fetch(); }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewQueue;
