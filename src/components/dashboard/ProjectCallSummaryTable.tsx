import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { CalendarIcon, X, RefreshCw, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGhlCallSync } from "@/hooks/useGhlCallSync";

interface ProjectStats {
  inbound: number;
  outbound: number;
  confirmed: number;
}

type QuickFilter = "today" | "week" | "month" | "all";

const ProjectCallSummaryTable = () => {
  const [stats, setStats] = useState<Record<string, ProjectStats>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activeQuick, setActiveQuick] = useState<QuickFilter>("all");
  const { syncing, progress, syncAllProjects, cancelSync } = useGhlCallSync();

  const applyQuickFilter = (filter: QuickFilter) => {
    setActiveQuick(filter);
    const now = new Date();
    switch (filter) {
      case "today": setDateFrom(startOfDay(now)); setDateTo(endOfDay(now)); break;
      case "week": setDateFrom(startOfWeek(now, { weekStartsOn: 1 })); setDateTo(endOfWeek(now, { weekStartsOn: 1 })); break;
      case "month": setDateFrom(startOfMonth(now)); setDateTo(endOfMonth(now)); break;
      case "all": setDateFrom(undefined); setDateTo(undefined); break;
    }
  };

  const setCustomDate = (type: "from" | "to", date: Date | undefined) => {
    setActiveQuick("all");
    if (type === "from") setDateFrom(date ? startOfDay(date) : undefined);
    else setDateTo(date ? endOfDay(date) : undefined);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_project_call_summary', {
          p_date_from: dateFrom?.toISOString() || null,
          p_date_to: dateTo?.toISOString() || null,
        });
        if (error) throw error;
        const map: Record<string, ProjectStats> = {};
        for (const row of (data || [])) {
          map[row.project_name] = {
            inbound: Number(row.inbound),
            outbound: Number(row.outbound),
            confirmed: Number(row.confirmed),
          };
        }
        setStats(map);
      } catch (err) {
        console.error("Error fetching project summary:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateFrom, dateTo, refreshKey]);

  const sorted = Object.entries(stats).sort(([, a], [, b]) => b.inbound + b.outbound - (a.inbound + a.outbound));
  const totals = sorted.reduce(
    (acc, [, s]) => ({ inbound: acc.inbound + s.inbound, outbound: acc.outbound + s.outbound, confirmed: acc.confirmed + s.confirmed }),
    { inbound: 0, outbound: 0, confirmed: 0 }
  );

  const handleSync = () => {
    syncAllProjects({
      dateFrom: dateFrom?.toISOString(),
      dateTo: dateTo?.toISOString(),
      onComplete: () => setRefreshKey(k => k + 1),
    });
  };

  const quickButtons: { label: string; value: QuickFilter }[] = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "All Time", value: "all" },
  ];

  const progressPercent = progress ? Math.round(((progress.projectIndex + (progress.hasMore ? 0.5 : 1)) / progress.totalProjects) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Performance Summary</CardTitle>
        <div className="flex items-center gap-2">
          {syncing && (
            <Button size="sm" variant="ghost" onClick={cancelSync} className="gap-1.5 text-destructive">
              <StopCircle className="h-3.5 w-3.5" /> Cancel
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync from GHL"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Progress */}
        {syncing && progress && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{progress.currentProject}</span>
              <span className="text-muted-foreground shrink-0 ml-2">
                {progress.projectIndex + 1}/{progress.totalProjects} projects
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.totalSynced.toLocaleString()} calls synced</span>
              <span>{progress.totalProcessed.toLocaleString()} conversations processed</span>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {quickButtons.map((btn) => (
            <Button key={btn.value} size="sm"
              variant={activeQuick === btn.value ? "default" : "outline"}
              onClick={() => applyQuickFilter(btn.value)}
              className="rounded-full text-xs h-7 px-3"
            >{btn.label}</Button>
          ))}
          <div className="h-4 w-px bg-border mx-1" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1", dateFrom && activeQuick === "all" && "border-primary")}>
                <CalendarIcon className="h-3 w-3" />
                {dateFrom && activeQuick === "all" ? format(dateFrom, "MMM dd") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => setCustomDate("from", d)} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1", dateTo && activeQuick === "all" && "border-primary")}>
                <CalendarIcon className="h-3 w-3" />
                {dateTo && activeQuick === "all" ? format(dateTo, "MMM dd") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => setCustomDate("to", d)} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {(dateFrom || dateTo) && (
            <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => applyQuickFilter("all")}>
              {dateFrom && dateTo ? `${format(dateFrom, "MMM dd")} – ${format(dateTo, "MMM dd, yyyy")}` : dateFrom ? `From ${format(dateFrom, "MMM dd, yyyy")}` : `Until ${format(dateTo!, "MMM dd, yyyy")}`}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-8 w-full" />))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead className="text-right">Inbound Calls</TableHead>
                <TableHead className="text-right">Outbound Calls</TableHead>
                <TableHead className="text-right">Total Calls</TableHead>
                <TableHead className="text-right">Confirmed Appts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(([name, s]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="text-right">{s.inbound.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{s.outbound.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">{(s.inbound + s.outbound).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{s.confirmed.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Totals</TableCell>
                <TableCell className="text-right font-bold">{totals.inbound.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold">{totals.outbound.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold">{(totals.inbound + totals.outbound).toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold">{totals.confirmed.toLocaleString()}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectCallSummaryTable;
