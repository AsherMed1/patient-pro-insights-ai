import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { Phone, Calendar, User, Building, Eye, Clock, Mail, MapPin, Heart, FileText, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import CallDetailsModal from './CallDetailsModal';
import LeadDetailsModal from './LeadDetailsModal';
import { formatDateInCentralTime, formatTimeInCentralTime, formatDateTimeForTable } from '@/utils/dateTimeUtils';

interface NewLead {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  times_called: number;
  created_at: string;
  updated_at: string;
  actual_calls_count?: number;
  // New fields
  appt_date?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  status?: string;
  procedure_ordered?: boolean;
  phone_number?: string;
  calendar_location?: string;
  insurance_provider?: string;
  insurance_id?: string;
  insurance_plan?: string;
  group_number?: string;
  address?: string;
  notes?: string;
  card_image?: string;
  knee_pain_duration?: string;
  knee_osteoarthritis_diagnosis?: boolean;
  gae_candidate?: boolean;
  trauma_injury_onset?: boolean;
  pain_severity_scale?: number;
  symptoms_description?: string;
  knee_treatments_tried?: string;
  fever_chills?: boolean;
  knee_imaging?: boolean;
  heel_morning_pain?: boolean;
  heel_pain_improves_rest?: boolean;
  heel_pain_duration?: string;
  heel_pain_exercise_frequency?: string;
  plantar_fasciitis_treatments?: string;
  plantar_fasciitis_mobility_impact?: boolean;
  plantar_fasciitis_imaging?: boolean;
  email?: string;
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
  projectFilter?: string;
}

const NewLeadsManager = ({ viewOnly = false, projectFilter }: NewLeadsManagerProps) => {
  const [leads, setLeads] = useState<NewLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadCalls, setSelectedLeadCalls] = useState<CallRecord[]>([]);
  const [selectedLeadName, setSelectedLeadName] = useState<string>('');
  const [showCallsModal, setShowCallsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<NewLead | null>(null);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeadsWithCallCounts();
  }, [projectFilter]);

  const fetchLeadsWithCallCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch leads with optional project filtering
      let leadsQuery = supabase
        .from('new_leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (projectFilter) {
        leadsQuery = leadsQuery.eq('project_name', projectFilter);
      }
      
      const { data: leadsData, error: leadsError } = await leadsQuery;
      
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

  const handleViewFullDetails = (lead: NewLead) => {
    setSelectedLead(lead);
    setShowLeadDetailsModal(true);
  };

  const formatDate = (dateString: string) => {
    return formatDateInCentralTime(dateString);
  };

  const formatDateTime = (dateTimeString: string) => {
    return formatDateTimeForTable(dateTimeString);
  };

  const getDisplayName = (lead: NewLead) => {
    if (lead.first_name && lead.last_name) {
      return `${lead.first_name} ${lead.last_name}`;
    }
    return lead.lead_name;
  };

  const getPainSeverityColor = (scale?: number) => {
    if (!scale) return 'text-gray-500';
    if (scale <= 3) return 'text-green-600';
    if (scale <= 6) return 'text-yellow-600';
    if (scale <= 8) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {projectFilter ? `${projectFilter} - New Leads` : 'New Leads'}
          </CardTitle>
          <CardDescription>
            {leads.length} lead{leads.length !== 1 ? 's' : ''} recorded (Times in Central Time Zone)
            {viewOnly && " (View Only - Records created via API)"}
            {projectFilter && ` for ${projectFilter}`}
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
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{getDisplayName(lead)}</span>
                        {lead.status && (
                          <Badge variant="outline" className="text-xs">
                            {lead.status}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{lead.project_name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{formatDate(lead.date)}</span>
                        {lead.appt_date && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-blue-600">Appt: {formatDate(lead.appt_date)}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-blue-600 font-medium">
                          Came in: {formatDateTime(lead.created_at)}
                        </span>
                      </div>

                      {/* Additional Information Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 pt-3 border-t">
                        {lead.phone_number && (
                          <div className="flex items-center space-x-1 text-xs">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600">{lead.phone_number}</span>
                          </div>
                        )}
                        
                        {lead.email && (
                          <div className="flex items-center space-x-1 text-xs">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600">{lead.email}</span>
                          </div>
                        )}
                        
                        {lead.address && (
                          <div className="flex items-center space-x-1 text-xs">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600">{lead.address}</span>
                          </div>
                        )}
                        
                        {lead.pain_severity_scale && (
                          <div className="flex items-center space-x-1 text-xs">
                            <Heart className="h-3 w-3 text-gray-400" />
                            <span className={`font-medium ${getPainSeverityColor(lead.pain_severity_scale)}`}>
                              Pain: {lead.pain_severity_scale}/10
                            </span>
                          </div>
                        )}
                        
                        {lead.insurance_provider && (
                          <div className="flex items-center space-x-1 text-xs">
                            <FileText className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600">{lead.insurance_provider}</span>
                          </div>
                        )}
                        
                        {lead.procedure_ordered && (
                          <div className="text-xs">
                            <Badge variant="secondary" className="text-xs">
                              Procedure Ordered
                            </Badge>
                          </div>
                        )}
                      </div>

                      {lead.notes && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Notes:</strong> {lead.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
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
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFullDetails(lead)}
                        className="flex items-center space-x-1"
                      >
                        <Info className="h-3 w-3" />
                        <span>See Full Details</span>
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

      <LeadDetailsModal
        isOpen={showLeadDetailsModal}
        onClose={() => setShowLeadDetailsModal(false)}
        lead={selectedLead}
      />
    </div>
  );
};

export default NewLeadsManager;
