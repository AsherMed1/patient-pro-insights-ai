
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar } from 'lucide-react';

interface AgentClaim {
  id: string;
  lead_name: string;
  lead_phone_number: string;
  project_name: string;
  date_of_appointment: string;
  agent: string;
  agent_number: string;
  updated_at: string;
}

const AgentClaimsTable = () => {
  const [claims, setClaims] = useState<AgentClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgentClaims();
  }, []);

  const fetchAgentClaims = async () => {
    try {
      setLoading(true);
      
      // Fetch appointments that have been claimed by agents (have agent and agent_number)
      const { data, error } = await supabase
        .from('all_appointments')
        .select('id, lead_name, lead_phone_number, project_name, date_of_appointment, agent, agent_number, updated_at')
        .not('agent', 'is', null)
        .not('agent_number', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      setClaims(data || []);
    } catch (error) {
      console.error('Error fetching agent claims:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent claims",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Agent Claims</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p>Loading agent claims...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Agent Claims ({claims.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {claims.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No agent claims found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Agent ID</TableHead>
                  <TableHead>Appointment Date</TableHead>
                  <TableHead>Claimed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">{claim.lead_name}</TableCell>
                    <TableCell>{claim.lead_phone_number || 'N/A'}</TableCell>
                    <TableCell>{claim.project_name}</TableCell>
                    <TableCell>{claim.agent}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {claim.agent_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(claim.date_of_appointment)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDateTime(claim.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentClaimsTable;
