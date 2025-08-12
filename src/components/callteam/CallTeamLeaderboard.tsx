import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Phone, Calendar } from "lucide-react";

export interface AgentMetric {
  name: string;
  callsMade: number;
  appointmentsBooked: number;
  timeOnCalls?: number;
}

interface LeaderboardProps {
  agents: AgentMetric[];
}

const MedalIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  return <Award className="h-5 w-5 text-amber-700" />;
};

const LeaderList = ({ title, items, metricKey, metricLabel }: { title: string; items: AgentMetric[]; metricKey: keyof AgentMetric; metricLabel: string; }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No data</div>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 3).map((agent, idx) => (
            <div key={`${title}-${agent.name}`} className="flex items-center justify-between p-3 border rounded-lg bg-white">
              <div className="flex items-center gap-3">
                <MedalIcon rank={idx + 1} />
                <div>
                  <div className="font-medium">{agent.name || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">Rank #{idx + 1}</div>
                </div>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {metricLabel}: {agent[metricKey] as number}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const CallTeamLeaderboard = ({ agents }: LeaderboardProps) => {
  const byDials = [...agents].sort((a, b) => (b.callsMade || 0) - (a.callsMade || 0));
  const byBooked = [...agents].sort((a, b) => (b.appointmentsBooked || 0) - (a.appointmentsBooked || 0));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LeaderList title="Top Dials" items={byDials} metricKey="callsMade" metricLabel="Dials" />
      <LeaderList title="Top Appointments Set" items={byBooked} metricKey="appointmentsBooked" metricLabel="Appts" />
    </div>
  );
};

export default CallTeamLeaderboard;
