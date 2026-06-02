import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountRow {
  project_name: string;
  leads_count: number;
  bookings_count: number;
}

type Metric = "leads" | "bookings";
type DatePreset = "this_month" | "last_month" | "custom";

interface DateRange {
  start: Date;
  end: Date;
}

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
  const [preset, setPreset] = useState<DatePreset>("this_month");
  const [customStart, setCustomStart] = useState<Date>(startOfMonth(new Date()));
  const [customEnd, setCustomEnd] = useState<Date>(endOfMonth(new Date()));

  const dateRange: DateRange = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month":
        return {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1)),
        };
      case "custom":
        return { start: customStart, end: customEnd };
    }
  }, [preset, customStart, customEnd]);

  const dateStartStr = format(dateRange.start, "yyyy-MM-dd");
  const dateEndStr = format(dateRange.end, "yyyy-MM-dd");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: projects } = await supabase
        .from("projects")
        .select("project_name")
        .eq("active", true)
        .neq("project_name", "PPM - Test Account")
        .order("project_name");

      const { data: leads } = await supabase
        .from("new_leads")
        .select("project_name")
        .gte("date", dateStartStr)
        .lte("date", dateEndStr)
        .neq("project_name", "PPM - Test Account")
        .limit(50000);

      const { data: appts } = await supabase
        .from("all_appointments")
        .select("project_name,is_reserved_block")
        .gte("date_appointment_created", dateStartStr)
        .lte("date_appointment_created", dateEndStr)
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
        leads_count: leadCounts.get(p.project_name) || 0,
        bookings_count: bookingCounts.get(p.project_name) || 0,
      }));

      setRows(merged);
      setLoading(false);
    };
    load();
  }, [dateStartStr, dateEndStr]);

  const { sorted, max } = useMemo(() => {
    const key = metric === "leads" ? "leads_count" : "bookings_count";
    const sorted = [...rows].sort((a, b) => b[key] - a[key]);
    const max = sorted.reduce((m, r) => Math.max(m, r[key]), 0);
    return { sorted, max };
  }, [rows, metric]);

  const rangeLabel = useMemo(() => {
    const sameMonth =
      dateRange.start.getMonth() === dateRange.end.getMonth() &&
      dateRange.start.getFullYear() === dateRange.end.getFullYear();
    if (sameMonth) {
      return format(dateRange.start, "MMMM yyyy");
    }
    return `${format(dateRange.start, "MMM d, yyyy")} – ${format(dateRange.end, "MMM d, yyyy")}`;
  }, [dateRange]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Account Performance Heatmap</h1>
                <p className="text-muted-foreground mt-1">
                  {rangeLabel} — color-coded by{" "}
                  {metric === "leads" ? "Leads" : "Bookings"} (red = low, green = high)
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
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreset("this_month")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                    preset === "this_month"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-accent"
                  )}
                >
                  This Month
                </button>
                <button
                  onClick={() => setPreset("last_month")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                    preset === "last_month"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-accent"
                  )}
                >
                  Last Month
                </button>
                <button
                  onClick={() => setPreset("custom")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                    preset === "custom"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-accent"
                  )}
                >
                  Custom
                </button>
              </div>

              {preset === "custom" && (
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal",
                          !customStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStart ? format(customStart, "PPP") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStart}
                        onSelect={(d) => d && setCustomStart(d)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground text-sm">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal",
                          !customEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEnd ? format(customEnd, "PPP") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEnd}
                        onSelect={(d) => d && setCustomEnd(d)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
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
                {metric === "leads" ? "Leads" : "Bookings"}
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
                    const value = metric === "leads" ? r.leads_count : r.bookings_count;
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
                          <div className="text-xs">Leads: {r.leads_count}</div>
                          <div className="text-xs">Bookings: {r.bookings_count}</div>
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