
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface NewLead {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  times_called: number;
  created_at: string;
  updated_at: string;
  actual_calls_count?: number;
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

const RECORDS_PER_PAGE = 50;

export const useLeads = (projectFilter?: string) => {
  const [leads, setLeads] = useState<NewLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedLeadCalls, setSelectedLeadCalls] = useState<CallRecord[]>([]);
  const [selectedLeadName, setSelectedLeadName] = useState<string>('');
  const [showCallsModal, setShowCallsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<NewLead | null>(null);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);
  const { toast } = useToast();

  const totalPages = Math.ceil(totalRecords / RECORDS_PER_PAGE);

  const fetchLeadsWithCallCounts = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // First get the total count
      let countQuery = supabase
        .from('new_leads')
        .select('*', { count: 'exact', head: true });
      
      if (projectFilter) {
        countQuery = countQuery.eq('project_name', projectFilter);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      
      setTotalRecords(count || 0);

      // Then get the paginated data
      const from = (page - 1) * RECORDS_PER_PAGE;
      const to = from + RECORDS_PER_PAGE - 1;
      
      let leadsQuery = supabase
        .from('new_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      
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
      setCurrentPage(page);
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

  const handlePageChange = (page: number) => {
    fetchLeadsWithCallCounts(page);
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

  useEffect(() => {
    fetchLeadsWithCallCounts(1);
    setCurrentPage(1);
  }, [projectFilter]);

  return {
    leads,
    loading,
    currentPage,
    totalPages,
    totalRecords,
    recordsPerPage: RECORDS_PER_PAGE,
    selectedLeadCalls,
    selectedLeadName,
    showCallsModal,
    setShowCallsModal,
    selectedLead,
    showLeadDetailsModal,
    setShowLeadDetailsModal,
    handleViewCalls,
    handleViewFullDetails,
    fetchLeadsWithCallCounts,
    handlePageChange
  };
};
