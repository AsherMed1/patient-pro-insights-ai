import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectStats {
  inbound: number;
  outbound: number;
  confirmed: number;
}

const DEMO_PROJECT = "PPM - Test Account";
const BATCH_SIZE = 1000;

async function fetchAllPaginated(
  table: "all_calls" | "all_appointments",
  columns: string,
  filters?: (query: any) => any
) {
  const results: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(columns).range(from, from + BATCH_SIZE - 1);
    if (filters) query = filters(query);
    const { data, error } = await query;
    if (error) throw error;
    if (data) results.push(...data);
    hasMore = data?.length === BATCH_SIZE;
    from += BATCH_SIZE;
  }

  return results;
}

const ProjectCallSummaryTable = () => {
  const [stats, setStats] = useState<Record<string, ProjectStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [calls, appointments] = await Promise.all([
          fetchAllPaginated("all_calls", "project_name, direction"),
          fetchAllPaginated("all_appointments", "project_name, status"),
        ]);

        const map: Record<string, ProjectStats> = {};

        for (const call of calls) {
          const name = call.project_name;
          if (name === DEMO_PROJECT) continue;
          if (!map[name]) map[name] = { inbound: 0, outbound: 0, confirmed: 0 };
          if (call.direction === "inbound") map[name].inbound++;
          else if (call.direction === "outbound") map[name].outbound++;
        }

        for (const appt of appointments) {
          const name = appt.project_name;
          if (name === DEMO_PROJECT) continue;
          if (!map[name]) map[name] = { inbound: 0, outbound: 0, confirmed: 0 };
          if (appt.status && appt.status.trim().toLowerCase() === "confirmed") {
            map[name].confirmed++;
          }
        }

        setStats(map);
      } catch (err) {
        console.error("Error fetching project summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sorted = Object.entries(stats).sort(
    ([, a], [, b]) => b.inbound + b.outbound - (a.inbound + a.outbound)
  );

  const totals = sorted.reduce(
    (acc, [, s]) => ({
      inbound: acc.inbound + s.inbound,
      outbound: acc.outbound + s.outbound,
      confirmed: acc.confirmed + s.confirmed,
    }),
    { inbound: 0, outbound: 0, confirmed: 0 }
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Performance Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Performance Summary</CardTitle>
      </CardHeader>
      <CardContent>
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
                <TableCell className="text-right font-semibold">
                  {(s.inbound + s.outbound).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">{s.confirmed.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">Totals</TableCell>
              <TableCell className="text-right font-bold">{totals.inbound.toLocaleString()}</TableCell>
              <TableCell className="text-right font-bold">{totals.outbound.toLocaleString()}</TableCell>
              <TableCell className="text-right font-bold">
                {(totals.inbound + totals.outbound).toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-bold">{totals.confirmed.toLocaleString()}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ProjectCallSummaryTable;
