import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AccountRow {
  project_name: string;
  leads_mtd: number;
  bookings_mtd: number;
}

type Metric = "leads" | "bookings";

// Returns an HSL color: red (low) -> yellow (mid) -> green (high)
const colorFor = (value: number, max: number) => {
  if (max <= 0) return "hsl(0 0% 90%)";
  const ratio = Math.min(1, value / max);
  // 0 -> red (0deg), 0.5 -> yellow (60deg), 1 -> green (120deg)
  const hue = ratio * 120;
  return `hsl(${hue} 75% 55%)`;
};

const AccountPerformanceHeatmap = () => {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>("leads");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const isoStart = monthStart.toISOString();
      const dateStart = isoStart.slice(0, 10);

      const { data: projects } = await supabase
        .from("projects")
        .select("project_name")
        .eq("active", true)
        .neq("project_name", "PPM - Test Account")
        .order("project_name");

      const { data: leads } = await supabase
        .from("new_leads")
        .select("project_name")
        .gte("date", dateStart)
        .neq("project_name", "PPM - Test Account")
        .limit(50000);

      const { data: appts } = await supabase
        .from("all_appointments")
        .select("project_name,is_reserved_block")
        .gte("date_appointment_created", dateStart)
        .neq("project_name", "PPM - Test Account")
        .limit(50000);

      const leadCounts = new Map<string, number>();
      (leads || []).forEach((l: any) => {
        if (!l.project_name) return;
        leadCounts.set(l.project_name, (leadCounts.get(l.project_name) || 0) + 1);
      });

      const bookingCounts = new Map<string, number>();
      (appts || []).forEach((a: any) => {
        if (!a.project_name) return;
        if (a.is_reserved_block) return;
        bookingCounts.set(a.project_name, (bookingCounts.get(a.project_name) || 0) + 1);
      });

      const merged: AccountRow[] = (projects || []).map((p: any) => ({
        project_name: p.project_name,
        leads_mtd: leadCounts.get(p.project_name) || 0,
        bookings_mtd: bookingCounts.get(p.project_name) || 0,
      }));

      setRows(merged);
      setLoading(false);
    };
    load();
  }, []);

  const { sorted, max } = useMemo(() => {
    const key = metric === "leads" ? "leads_mtd" : "bookings_mtd";
    const sorted = [...rows].sort((a, b) => b[key] - a[key]);
    const max = sorted.reduce((m, r) => Math.max(m, r[key]), 0);
    return { sorted, max };
  }, [rows, metric]);

  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Account Performance Heatmap</h1>
              <p className="text-muted-foreground mt-1">
                {monthLabel} — color-coded by {metric === "leads" ? "Leads This Month" : "Bookings This Month"} (red = low, green = high)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMetric("leads")}
                className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                  metric === "leads"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-accent"
                }`}
              >
                Leads
              </button>
              <button
                onClick={() => setMetric("bookings")}
                className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                  metric === "bookings"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-accent"
                }`}
              >
                Bookings
              </button>
            </div>
          </header>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">0</span>
                <div
                  className="h-3 flex-1 rounded"
                  style={{
                    background:
                      "linear-gradient(to right, hsl(0 75% 55%), hsl(60 75% 55%), hsl(120 75% 55%))",
                  }}
                />
                <span className="text-xs text-muted-foreground">{max}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                All Accounts ({sorted.length}) — sorted by{" "}
                {metric === "leads" ? "Leads" : "Bookings"} MTD
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-md" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {sorted.map((r) => {
                    const value = metric === "leads" ? r.leads_mtd : r.bookings_mtd;
                    const bg = colorFor(value, max);
                    return (
                      <Tooltip key={r.project_name}>
                        <TooltipTrigger asChild>
                          <div
                            className="rounded-md p-3 flex flex-col justify-between min-h-[96px] cursor-default border border-border/40 shadow-sm transition-transform hover:scale-[1.03]"
                            style={{ backgroundColor: bg }}
                          >
                            <div
                              className="text-xs font-semibold leading-tight line-clamp-3"
                              style={{ color: "hsl(0 0% 10%)" }}
                            >
                              {r.project_name}
                            </div>
                            <div className="flex items-end justify-between mt-2">
                              <div
                                className="text-2xl font-bold tabular-nums"
                                style={{ color: "hsl(0 0% 10%)" }}
                              >
                                {value}
                              </div>
                              <div
                                className="text-[10px] uppercase tracking-wide font-medium"
                                style={{ color: "hsl(0 0% 20%)" }}
                              >
                                {metric === "leads" ? "leads" : "books"}
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm font-semibold">{r.project_name}</div>
                          <div className="text-xs">Leads MTD: {r.leads_mtd}</div>
                          <div className="text-xs">Bookings MTD: {r.bookings_mtd}</div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AccountPerformanceHeatmap;
