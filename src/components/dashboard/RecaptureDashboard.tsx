import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, subDays } from "date-fns";
import { RotateCcw, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface RecaptureEvent {
  lost_appointment_id: string;
  patient_name: string;
  project_name: string;
  lost_status: string;
  lost_date: string | null;
  lost_created_at: string;
  recapture_appointment_id: string | null;
  recapture_status: string | null;
  recapture_date: string | null;
  recapture_created_at: string | null;
  recapture_procedure_ordered: boolean | null;
  days_to_recapture: number | null;
  recapture_outcome: "not_recaptured" | "showed" | "lost_again" | "pending";
}

const OUTCOME_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  showed: { label: "Showed", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  lost_again: { label: "Lost Again", variant: "destructive" },
  not_recaptured: { label: "Not Recaptured", variant: "outline" },
};

interface RecaptureDashboardProps {
  projectFilter?: string;
}

const RecaptureDashboard = ({ projectFilter }: RecaptureDashboardProps) => {
  const [events, setEvents] = useState<RecaptureEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<string>(projectFilter || "ALL");
  const [reason, setReason] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [projects, setProjects] = useState<string[]>([]);

  useEffect(() => {
    if (projectFilter) setProject(projectFilter);
  }, [projectFilter]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from("recapture_events" as any)
        .select("*")
        .gte("lost_created_at", `${startDate}T00:00:00`)
        .lte("lost_created_at", `${endDate}T23:59:59`)
        .order("lost_created_at", { ascending: false })
        .limit(2000);

      if (project !== "ALL") q = q.eq("project_name", project);

      const { data, error } = await q;
      if (cancelled) return;

      if (error) {
        console.error("recapture_events load error", error);
        setEvents([]);
      } else {
        let rows = (data || []) as unknown as RecaptureEvent[];
        if (reason !== "ALL") {
          rows = rows.filter(r => (r.lost_status || "").toLowerCase().trim() === reason.toLowerCase());
        }
        setEvents(rows);
        if (!projectFilter) {
          const uniq = Array.from(new Set(rows.map(r => r.project_name).filter(Boolean))).sort();
          setProjects(prev => Array.from(new Set([...prev, ...uniq])).sort());
        }
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [project, reason, startDate, endDate, projectFilter]);

  // load all projects once for dropdown
  useEffect(() => {
    if (projectFilter) return;
    supabase.from("projects").select("project_name").eq("active", true).then(({ data }) => {
      if (data) setProjects(data.map((p: any) => p.project_name).sort());
    });
  }, [projectFilter]);

  const kpis = useMemo(() => {
    const total = events.length;
    const recaptured = events.filter(e => e.recapture_appointment_id).length;
    const showed = events.filter(e => e.recapture_outcome === "showed").length;
    const won = events.filter(e => e.recapture_procedure_ordered === true).length;
    const lostAgain = events.filter(e => e.recapture_outcome === "lost_again").length;
    const days = events.filter(e => e.days_to_recapture != null).map(e => e.days_to_recapture!);
    const avgDays = days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : 0;
    const rate = total ? Math.round((recaptured / total) * 1000) / 10 : 0;
    return { total, recaptured, showed, won, lostAgain, avgDays, rate };
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Recapture Tracking</h2>
      </div>
      <p className="text-muted-foreground text-sm">
        Patients who Cancelled, No-Showed, or were marked Do Not Call — and whether they came back on the schedule.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {!projectFilter && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Project</label>
            <Select value={project} onValueChange={setProject}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Lost Reason</label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Reasons</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="No Show">No Show</SelectItem>
              <SelectItem value="Do Not Call">Do Not Call</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From (lost date)</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[170px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To (lost date)</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[170px]" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> Lost Appts
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <RotateCcw className="h-4 w-4" /> Recaptured
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.recaptured}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Recapture Rate
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{kpis.rate}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Showed
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{kpis.showed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Procedure Won</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.won}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" /> Avg Days
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.avgDays}</div></CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recapture Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading…</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No lost appointments in this period.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Lost Date</TableHead>
                    <TableHead>Lost Reason</TableHead>
                    <TableHead>Recapture Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.slice(0, 500).map(e => {
                    const outcome = OUTCOME_LABEL[e.recapture_outcome] || OUTCOME_LABEL.not_recaptured;
                    return (
                      <TableRow key={e.lost_appointment_id}>
                        <TableCell className="font-medium">{e.patient_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.project_name}</TableCell>
                        <TableCell className="text-sm">{e.lost_created_at ? format(parseISO(e.lost_created_at), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="text-sm">{e.lost_status}</TableCell>
                        <TableCell className="text-sm">{e.recapture_created_at ? format(parseISO(e.recapture_created_at), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="text-sm">{e.days_to_recapture ?? "—"}</TableCell>
                        <TableCell><Badge variant={outcome.variant}>{outcome.label}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {events.length > 500 && (
                <p className="text-xs text-muted-foreground mt-3">Showing first 500 of {events.length}. Narrow the date range to see more.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecaptureDashboard;
