import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { Phone, Calendar, User, Building, Eye } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import CallDetailsModal from './CallDetailsModal';
import { formatDateInCentralTime } from '@/utils/dateTimeUtils';

interface NewLead {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  times_called: number;
  created_at: string;
  updated_at: string;
  actual_calls_count?: number;
}

interface CallRecord {
  id: string;
  date: string;
  call_datetime: string;
  lead_name: string;
  lead_phone_number: string;
  project_name: string;
  direction: string;
  status: string;
  duration_seconds: number;
  agent: string | null;
  recording_url: string | null;
  call_summary: string | null;
}

interface NewLeadsManagerProps {
  viewOnly?: boolean;
}

const NewLeadsManager = ({ viewOnly = false }: NewLeadsManagerProps) => {
  const [leads, setLeads] = useState<NewLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadCalls, setSelectedLeadCalls] = useState<CallRecord[]>([]);
  const [selectedLeadName, setSelectedLeadName] = useState<string>('');
  const [showCallsModal, setShowCallsModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeadsWithCallCounts();
  }, []);

  const fetchLeadsWithCallCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('new_leads')
        .select('*')
        .order('date', { ascending: false });
      
      if (leadsError) throw leadsError;

      // Fetch all calls to calculate actual call counts
      const { data: callsData, error: callsError } = await supabase
        .from('all_calls')
        .select('lead_name');
      
      if (callsError) throw callsError;

      // Calculate actual call counts for each lead
      const leadsWithCallCounts = (leadsData || []).map(lead => {
        const actualCallsCount = (callsData || []).filter(
          call => call.lead_name.toLowerCase().trim() === lead.lead_name.toLowerCase().trim()
        ).length;
        
        return {
          ...lead,
          actual_calls_count: actualCallsCount
        };
      });

      setLeads(leadsWithCallCounts);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewCalls = async (leadName: string) => {
    try {
      const { data: callsData, error } = await supabase
        .from('all_calls')
        .select('*')
        .ilike('lead_name', leadName)
        .order('call_datetime', { ascending: false });
      
      if (error) throw error;
      
      setSelectedLeadCalls(callsData || []);
      setSelectedLeadName(leadName);
      setShowCallsModal(true);
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch call details",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateInCentralTime(dateString);
  };

  return (
    <div className="space-y-6">
      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>New Leads</CardTitle>
          <CardDescription>
            {leads.length} lead{leads.length !== 1 ? 's' : ''} recorded (Dates in Central Time Zone)
            {viewOnly && " (View Only - Records created via API)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading leads...</div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No leads recorded yet</div>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div key={lead.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{lead.lead_name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{lead.project_name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{formatDate(lead.date)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCalls(lead.lead_name)}
                        className="flex items-center space-x-1"
                        disabled={!lead.actual_calls_count || lead.actual_calls_count === 0}
                      >
                        <Phone className="h-3 w-3" />
                        <span>{lead.actual_calls_count || 0} calls</span>
                        {lead.actual_calls_count && lead.actual_calls_count > 0 && (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CallDetailsModal
        isOpen={showCallsModal}
        onClose={() => setShowCallsModal(false)}
        leadName={selectedLeadName}
        calls={selectedLeadCalls}
      />
    </div>
  );
};

export default NewLeadsManager;
