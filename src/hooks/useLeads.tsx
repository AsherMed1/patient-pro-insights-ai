
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
  patient_intake_notes?: string;
  contact_id?: string;
  ai_summary?: string;
  appointment_info?: {
    lead_name: string;
    lead_phone_number: string | null;
    lead_email: string | null;
    date_of_appointment: string | null;
    requested_time: string | null;
    status: string | null;
    confirmed: boolean | null;
    showed: boolean | null;
    calendar_name: string | null;
  } | null;
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

export const useLeads = (projectFilter?: string) => {
  const [leads, setLeads] = useState<NewLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadCalls, setSelectedLeadCalls] = useState<CallRecord[]>([]);
  const [selectedLeadName, setSelectedLeadName] = useState<string>('');
  const [showCallsModal, setShowCallsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<NewLead | null>(null);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [nameSearch, setNameSearch] = useState<string>('');
  const { toast } = useToast();

  const LEADS_PER_PAGE = 50;

  const fetchLeads = async (page: number = currentPage) => {
    try {
      setLoading(true);
      
      // Build the base query for counting
      let countQuery = supabase
        .from('new_leads')
        .select('*', { count: 'exact', head: true });

      // Apply project filter
      if (projectFilter) {
        countQuery = countQuery.eq('project_name', projectFilter);
      }
      
      // Apply date range filter
      if (dateRange.from) {
        countQuery = countQuery.gte('date', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange.to) {
        countQuery = countQuery.lte('date', dateRange.to.toISOString().split('T')[0]);
      }

      // Apply name search filter
      if (nameSearch.trim()) {
        countQuery = countQuery.or(`lead_name.ilike.%${nameSearch.trim()}%,first_name.ilike.%${nameSearch.trim()}%,last_name.ilike.%${nameSearch.trim()}%`);
      }

      // Get the total count first
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Now build the data query with the same filters
      let leadsQuery = supabase
        .from('new_leads')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply the same filters to the data query
      if (projectFilter) {
        leadsQuery = leadsQuery.eq('project_name', projectFilter);
      }
      
      if (dateRange.from) {
        leadsQuery = leadsQuery.gte('date', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange.to) {
        leadsQuery = leadsQuery.lte('date', dateRange.to.toISOString().split('T')[0]);
      }

      // Apply name search filter to data query
      if (nameSearch.trim()) {
        leadsQuery = leadsQuery.or(`lead_name.ilike.%${nameSearch.trim()}%,first_name.ilike.%${nameSearch.trim()}%,last_name.ilike.%${nameSearch.trim()}%`);
      }
      
      // Apply pagination
      const from = (page - 1) * LEADS_PER_PAGE;
      const to = from + LEADS_PER_PAGE - 1;
      leadsQuery = leadsQuery.range(from, to);
      
      const { data: leadsData, error: leadsError } = await leadsQuery;
      
      if (leadsError) throw leadsError;

      // Fetch appointments for these leads
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('all_appointments')
        .select('lead_name, lead_phone_number, lead_email, date_of_appointment, requested_time, status, confirmed, showed, calendar_name')
        .order('date_of_appointment', { ascending: false });
      
      if (appointmentsError) throw appointmentsError;

      // Add appointment info for each lead
      const leadsWithAppointments = (leadsData || []).map(lead => {
        // Find the most recent appointment for this lead
        const leadAppointments = (appointmentsData || []).filter(
          appt => {
            // 1. Try exact name match
            const nameMatch = appt.lead_name.toLowerCase().trim() === lead.lead_name.toLowerCase().trim();
            if (nameMatch) return true;
            
            // 2. Try phone number match (normalize phone numbers)
            if (lead.phone_number && appt.lead_phone_number) {
              const leadPhone = lead.phone_number.replace(/\D/g, '');
              const apptPhone = appt.lead_phone_number.replace(/\D/g, '');
              if (leadPhone === apptPhone && leadPhone.length >= 10) return true;
            }
            
            // 3. Try email match
            if (lead.email && appt.lead_email && 
                lead.email.toLowerCase().trim() === appt.lead_email.toLowerCase().trim()) {
              return true;
            }
            
            return false;
          }
        );
        
        const mostRecentAppointment = leadAppointments.length > 0 ? leadAppointments[0] : null;
        
        return {
          ...lead,
          appointment_info: mostRecentAppointment
        };
      });

      setLeads(leadsWithAppointments);
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
      // Find the lead to get phone number and contact_id for matching
      const lead = leads.find(l => l.lead_name === leadName);
      
      // Get all calls and filter client-side for better matching control
      const { data: allCallsData, error } = await supabase
        .from('all_calls')
        .select('*')
        .order('call_datetime', { ascending: false });
      
      if (error) throw error;
      
      // Filter calls using comprehensive matching logic
      const matchingCalls = (allCallsData || []).filter(call => {
        // 1. Try exact name match
        const nameMatch = call.lead_name.toLowerCase().trim() === leadName.toLowerCase().trim();
        if (nameMatch) return true;
        
        // 2. Try phone number match (normalize phone numbers)
        if (lead?.phone_number && call.lead_phone_number) {
          const leadPhone = lead.phone_number.replace(/\D/g, '');
          const callPhone = call.lead_phone_number.replace(/\D/g, '');
          if (leadPhone === callPhone && leadPhone.length >= 10) return true;
        }
        
        // Note: all_calls table only has lead_name and lead_phone_number
        // Email and contact_id fields are not available in calls table
        
        return false;
      });
      
      setSelectedLeadCalls(matchingCalls);
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
    setCurrentPage(1); // Reset to first page when filters change
    fetchLeads(1);
  }, [projectFilter, dateRange, nameSearch]);

  useEffect(() => {
    fetchLeads(currentPage);
  }, [currentPage]);

  return {
    leads,
    loading,
    selectedLeadCalls,
    selectedLeadName,
    showCallsModal,
    setShowCallsModal,
    selectedLead,
    showLeadDetailsModal,
    setShowLeadDetailsModal,
    handleViewCalls,
    handleViewFullDetails,
    fetchLeads,
    currentPage,
    setCurrentPage,
    totalCount,
    dateRange,
    setDateRange,
    nameSearch,
    setNameSearch,
    leadsPerPage: LEADS_PER_PAGE
  };
};
