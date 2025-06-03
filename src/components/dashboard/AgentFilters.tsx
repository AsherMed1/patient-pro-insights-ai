
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AgentFiltersProps {
  agents: Array<{ id: string; agent_name: string }>;
  selectedAgent: string;
  onAgentChange: (agent: string) => void;
}

const AgentFilters = ({
  agents,
  selectedAgent,
  onAgentChange
}: AgentFiltersProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Agent:</label>
          <Select value={selectedAgent} onValueChange={onAgentChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Agents (Collective)</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.agent_name}>
                  {agent.agent_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentFilters;
