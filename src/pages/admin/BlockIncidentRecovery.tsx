import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Download, ShieldCheck, Play, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Suspect = {
  id: string;
  project_name: string;
  lead_name: string;
  status: string | null;
  ghl_status: string | null;
  ghl_appointment_id: string | null;
  signatures: string[];
};

type AuditResp = {
  total_suspects: number;
  signature_a_count: number;
  signature_b_count: number;
  per_project: Record<string, { suspect: number; ghl_cancelled: number; ghl_deleted: number }>;
  suspects: Suspect[];
};

type RestoreResp = {
  mode: 'dry_run' | 'execute';
  total: number;
  summary: Record<string, number>;
  results: Array<{
    appointment_id: string;
    project_name: string;
    lead_name: string;
    action: string;
    detail?: string;
  }>;
};

const BlockIncidentRecovery = () => {
  const { toast } = useToast();
  const [projectFilter, setProjectFilter] = useState('');
  const [dndSuppress, setDndSuppress] = useState(true);
  const [dndHours, setDndHours] = useState(24);

  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState<AuditResp | null>(null);

  const [drying, setDrying] = useState(false);
  const [dryRun, setDryRun] = useState<RestoreResp | null>(null);

  const [executing, setExecuting] = useState(false);
  const [confirmCount, setConfirmCount] = useState('');
  const [executeResult, setExecuteResult] = useState<RestoreResp | null>(null);

  // Single-appointment restore (Eugene Schneeberger prefilled)
  const [singleId, setSingleId] = useState('1ac1175c-be6a-40f0-b40f-11454e229f5e');
  const [singleDry, setSingleDry] = useState(false);
  const [singleExec, setSingleExec] = useState(false);
  const [singleDryResult, setSingleDryResult] = useState<RestoreResp | null>(null);
  const [singleExecResult, setSingleExecResult] = useState<RestoreResp | null>(null);

  const runSingle = async (mode: 'dry_run' | 'execute') => {
    if (!singleId.trim()) {
      toast({ title: 'Missing ID', description: 'Enter an appointment UUID.', variant: 'destructive' });
      return;
    }
    const setLoading = mode === 'dry_run' ? setSingleDry : setSingleExec;
    const setResult = mode === 'dry_run' ? setSingleDryResult : setSingleExecResult;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('restore-block-incident-appointments', {
        body: {
          mode,
          appointment_ids: [singleId.trim()],
          dnd_suppress: dndSuppress,
          dnd_window_hours: dndHours,
        },
      });
      if (error) throw error;
      setResult(data as RestoreResp);
      toast({
        title: mode === 'dry_run' ? 'Dry-run complete' : 'Restoration complete',
        description: `${data.total} appointment(s): ${JSON.stringify(data.summary)}`,
      });
    } catch (e: any) {
      toast({ title: `${mode} failed`, description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async () => {
    setAuditing(true);
    setAudit(null);
    try {
      const { data, error } = await supabase.functions.invoke('audit-time-block-cancellations', {
        body: {
          project_name: projectFilter || undefined,
          check_ghl: true,
        },
      });
      if (error) throw error;
      setAudit(data as AuditResp);
      toast({ title: 'Audit complete', description: `${data.total_suspects} suspect appointments found.` });
    } catch (e: any) {
      toast({ title: 'Audit failed', description: e.message, variant: 'destructive' });
    } finally {
      setAuditing(false);
    }
  };

  const downloadCsv = async () => {
    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      const url = `https://bhabbokbhnqioykjimix.supabase.co/functions/v1/audit-time-block-cancellations?format=csv${projectFilter ? `&project_name=${encodeURIComponent(projectFilter)}` : ''}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await r.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `block-incident-audit-${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e: any) {
      toast({ title: 'CSV download failed', description: e.message, variant: 'destructive' });
    }
  };

  const runDryRun = async () => {
    setDrying(true);
    setDryRun(null);
    try {
      const { data, error } = await supabase.functions.invoke('restore-block-incident-appointments', {
        body: {
          mode: 'dry_run',
          project_name: projectFilter || undefined,
          dnd_suppress: dndSuppress,
          dnd_window_hours: dndHours,
        },
      });
      if (error) throw error;
      setDryRun(data as RestoreResp);
      toast({ title: 'Dry-run complete', description: `${data.total} appointments evaluated.` });
    } catch (e: any) {
      toast({ title: 'Dry-run failed', description: e.message, variant: 'destructive' });
    } finally {
      setDrying(false);
    }
  };

  const runExecute = async () => {
    if (!dryRun) return;
    if (parseInt(confirmCount, 10) !== dryRun.total) {
      toast({
        title: 'Confirmation mismatch',
        description: `Type ${dryRun.total} to confirm execution against ${dryRun.total} appointments.`,
        variant: 'destructive',
      });
      return;
    }
    setExecuting(true);
    setExecuteResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('restore-block-incident-appointments', {
        body: {
          mode: 'execute',
          project_name: projectFilter || undefined,
          dnd_suppress: dndSuppress,
          dnd_window_hours: dndHours,
        },
      });
      if (error) throw error;
      setExecuteResult(data as RestoreResp);
      toast({ title: 'Restoration complete', description: JSON.stringify(data.summary) });
    } catch (e: any) {
      toast({ title: 'Restore failed', description: e.message, variant: 'destructive' });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Block-Incident Recovery</h1>
        <p className="text-muted-foreground mt-2">
          Bulk-restore appointments silently cancelled in GoHighLevel by clinic time blocks.
          Restores GHL status, suppresses reschedule comms, and mirrors the change back into the portal.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Workflow</AlertTitle>
        <AlertDescription>
          1. Run <strong>Audit</strong> to identify victims system-wide. 2. Run <strong>Dry-run</strong> to preview the
          per-row actions. 3. Type the confirmation count, then <strong>Execute</strong>. Affected contacts get tagged{' '}
          <code className="text-xs bg-muted px-1 rounded">lovable_block_incident_restored</code> so the reschedule workflow
          (filtered on this tag) skips them.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="project">Project (blank = all clinics)</Label>
              <Input
                id="project"
                placeholder="e.g. Vascular Institute of Michigan"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Switch id="dnd" checked={dndSuppress} onCheckedChange={setDndSuppress} />
              <Label htmlFor="dnd">Temporarily suppress SMS/Email</Label>
            </div>
            <div>
              <Label htmlFor="hours">DND window (hours)</Label>
              <Input
                id="hours"
                type="number"
                min={1}
                max={168}
                value={dndHours}
                onChange={(e) => setDndHours(Number(e.target.value) || 24)}
                disabled={!dndSuppress}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Audit</CardTitle>
          <CardDescription>Read-only. Identifies suspects and checks GHL ground-truth status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runAudit} disabled={auditing}>
              {auditing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Run audit
            </Button>
            <Button variant="outline" onClick={downloadCsv} disabled={!audit}>
              <Download className="h-4 w-4 mr-2" /> Download CSV
            </Button>
          </div>
          {audit && (
            <div className="space-y-2">
              <div className="flex gap-4 text-sm">
                <Badge variant="secondary">Total: {audit.total_suspects}</Badge>
                <Badge variant="outline">Signature A: {audit.signature_a_count}</Badge>
                <Badge variant="outline">Signature B: {audit.signature_b_count}</Badge>
              </div>
              <div className="text-sm border rounded-md divide-y max-h-72 overflow-auto">
                {Object.entries(audit.per_project).map(([proj, c]) => (
                  <div key={proj} className="flex justify-between p-2">
                    <span className="font-medium">{proj}</span>
                    <span className="text-muted-foreground">
                      {c.suspect} suspect / {c.ghl_cancelled} cancelled in GHL / {c.ghl_deleted} deleted
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Dry-run restore</CardTitle>
          <CardDescription>Reports what would happen for each suspect. No writes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runDryRun} disabled={drying}>
            {drying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Run dry-run
          </Button>
          {dryRun && (
            <div className="space-y-2">
              <div className="text-sm">Evaluated <strong>{dryRun.total}</strong> appointments:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dryRun.summary).map(([action, count]) => (
                  <Badge key={action} variant="outline">{action}: {count}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> 3. Execute restore
          </CardTitle>
          <CardDescription>
            Performs all changes. Type the dry-run total below to confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="confirm">
                Type <strong>{dryRun?.total ?? '?'}</strong> to confirm
              </Label>
              <Input
                id="confirm"
                value={confirmCount}
                onChange={(e) => setConfirmCount(e.target.value)}
                placeholder="confirmation count"
                disabled={!dryRun}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="destructive"
                onClick={runExecute}
                disabled={!dryRun || executing}
              >
                {executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Execute restoration
              </Button>
            </div>
          </div>
          {executeResult && (
            <div className="space-y-2 mt-4">
              <div className="text-sm">Processed <strong>{executeResult.total}</strong> appointments:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(executeResult.summary).map(([action, count]) => (
                  <Badge
                    key={action}
                    variant={action === 'error' || action === 'slot_taken' ? 'destructive' : 'secondary'}
                  >
                    {action}: {count}
                  </Badge>
                ))}
              </div>
              <div className="text-sm border rounded-md divide-y max-h-96 overflow-auto mt-2">
                {executeResult.results.map((r) => (
                  <div key={r.appointment_id} className="p-2 flex justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.lead_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.project_name} · {r.detail}
                      </div>
                    </div>
                    <Badge
                      variant={r.action === 'error' || r.action === 'slot_taken' ? 'destructive' : 'outline'}
                      className="shrink-0"
                    >
                      {r.action}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BlockIncidentRecovery;
