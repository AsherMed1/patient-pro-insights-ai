import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardFilters from "@/components/DashboardFilters";
import CallMetricsCards from "@/components/dashboard/CallMetricsCards";
import ConversionMetrics from "@/components/dashboard/ConversionMetrics";
import AgentPerformanceSection from "@/components/dashboard/AgentPerformanceSection";
import CallTeamLeaderboard, { AgentMetric } from "./CallTeamLeaderboard";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const CallTeamTab = () => {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [selectedAgent, setSelectedAgent] = useState<string>("ALL");
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  const [agents, setAgents] = useState<AgentMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ totalDials: 0, connectRate: 0, appointmentsSet: 0, avgCallDuration: 0, leadContactRatio: 0 });

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedAgent]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const PAGE_SIZE = 1000;

      const buildCallsQuery = () => {
        let q = supabase.from("all_calls").select("agent, duration_seconds, date");
        if (dateRange.from) {
          const from = dateRange.from.toISOString().split("T")[0];
          q = q.gte("date", from);
        }
        if (dateRange.to) {
          const to = dateRange.to.toISOString().split("T")[0];
          q = q.lte("date", to);
        }
        if (selectedAgent !== "ALL") {
          q = q.eq("agent", selectedAgent);
        }
        return q;
      };

      const buildApptsQuery = () => {
        let q = supabase.from("all_appointments").select("agent, date_of_appointment");
        if (dateRange.from) {
          const from = dateRange.from.toISOString().split("T")[0];
          q = q.gte("date_of_appointment", from);
        }
        if (dateRange.to) {
          const to = dateRange.to.toISOString().split("T")[0];
          q = q.lte("date_of_appointment", to);
        }
        if (selectedAgent !== "ALL") {
          q = q.eq("agent", selectedAgent);
        }
        return q;
      };

      const fetchAll = async (buildQuery: () => any) => {
        let all: any[] = [];
        let offset = 0;
        while (true) {
          const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
          if (error) throw error;
          const chunk = data || [];
          all = all.concat(chunk);
          if (chunk.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }
        return all;
      };

      const [calls, appts] = await Promise.all([
        fetchAll(buildCallsQuery),
        fetchAll(buildApptsQuery),
      ]);

      // Build agent list for filter
      const callAgents = (calls || []).map((c: any) => c.agent).filter(Boolean);
      const apptAgents = (appts || []).map((a: any) => a.agent).filter(Boolean);
      const uniqueAgents = Array.from(new Set([...(callAgents as string[]), ...(apptAgents as string[])])).sort();
      setAvailableAgents(uniqueAgents);

      // Aggregate per agent
      const byAgent: Record<string, AgentMetric> = {};
      (calls || []).forEach((c: any) => {
        const name = c.agent || "Unknown";
        if (!byAgent[name]) byAgent[name] = { name, callsMade: 0, appointmentsBooked: 0, timeOnCalls: 0 };
        byAgent[name].callsMade += 1;
        byAgent[name].timeOnCalls = (byAgent[name].timeOnCalls || 0) + (c.duration_seconds || 0) / 60;
      });
      (appts || []).forEach((a: any) => {
        const name = a.agent || "Unknown";
        if (!byAgent[name]) byAgent[name] = { name, callsMade: 0, appointmentsBooked: 0, timeOnCalls: 0 };
        byAgent[name].appointmentsBooked += 1;
      });

      const agentsArr = Object.values(byAgent).sort((a, b) => (b.callsMade || 0) - (a.callsMade || 0));
      setAgents(agentsArr);

      // Totals
      const totalDials = (calls || []).length;
      const connectedCalls = (calls || []).filter((c: any) => (c.duration_seconds || 0) > 20).length;
      const connectRate = totalDials > 0 ? (connectedCalls / totalDials) * 100 : 0;
      const totalDuration = (calls || []).reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0);
      const avgCallDuration = connectedCalls > 0 ? totalDuration / connectedCalls / 60 : 0;
      const appointmentsSet = (appts || []).length;
      const leadContactRatio = appointmentsSet > 0 ? totalDials / appointmentsSet : 0;

      setTotals({ totalDials, connectRate, appointmentsSet, avgCallDuration, leadContactRatio });
    } catch (e) {
      console.error("Error loading call team data", e);
      setAgents([]);
      setTotals({ totalDials: 0, connectRate: 0, appointmentsSet: 0, avgCallDuration: 0, leadContactRatio: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[300px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-muted-foreground">Loading Call Team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        procedure={"ALL"}
        onProcedureChange={() => {}}
        selectedAgent={selectedAgent}
        onAgentChange={setSelectedAgent}
        availableAgents={availableAgents}
      />

      {/* Leaderboard */}
      <CallTeamLeaderboard agents={agents} />

      {/* High-level metrics */}
      <CallMetricsCards
        totalDials={totals.totalDials}
        connectRate={totals.connectRate}
        appointmentsSet={totals.appointmentsSet}
        avgCallDuration={totals.avgCallDuration}
      />

      <ConversionMetrics
        totalDials={totals.totalDials}
        connectRate={totals.connectRate}
        appointmentsSet={totals.appointmentsSet}
        leadContactRatio={totals.leadContactRatio}
      />

      {/* Per-agent cards */}
      <AgentPerformanceSection
        agents={agents.map((a) => ({ name: a.name, callsMade: a.callsMade, timeOnCalls: a.timeOnCalls || 0, appointmentsBooked: a.appointmentsBooked }))}
        totalAppointments={totals.appointmentsSet}
      />
    </div>
  );
};

export default CallTeamTab;
