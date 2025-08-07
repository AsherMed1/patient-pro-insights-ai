
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

  const fetchLeadsWithCallCounts = async (page: number = currentPage) => {
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

      // Fetch all calls for matching
      const { data: callsData, error: callsError } = await supabase
        .from('all_calls')
        .select('lead_name, lead_phone_number, ghl_id, project_name');
      
      if (callsError) throw callsError;

      // Fetch appointments for these leads
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('all_appointments')
        .select('lead_name, lead_phone_number, lead_email, date_of_appointment, requested_time, status, calendar_name, ghl_id')
        .order('date_of_appointment', { ascending: false });
      
      if (appointmentsError) throw appointmentsError;

      // Helper function to normalize phone numbers (handle +1 prefix properly)
      const normalizePhoneNumber = (phone: string | null | undefined): string => {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        // For US numbers starting with '1', remove the '1' prefix to get 10-digit number
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
          return cleaned.slice(1);
        }
        return cleaned;
      };

      // Calculate actual call counts and add appointment info for each lead
      const leadsWithCallCounts = (leadsData || []).map(lead => {
        const matchingCalls = (callsData || []).filter(call => {
          // Debug specific lead
          const isDebugLead = lead.lead_name === 'Tricia Norwood';
          
          // Primary: Match by contact_id/ghl_id (case-insensitive)
          if (lead.contact_id && call.ghl_id) {
            const leadId = lead.contact_id.toLowerCase().trim();
            const callId = call.ghl_id.toLowerCase().trim();
            
            if (isDebugLead) {
              console.log('GHL ID match attempt:', {
                leadId: leadId,
                callId: callId,
                match: leadId === callId,
                leadContactId: lead.contact_id,
                callGhlId: call.ghl_id
              });
            }
            
            if (leadId === callId) {
              return true;
            }
          }
          
          // Secondary: Match by phone number
          if (lead.phone_number && call.lead_phone_number) {
            const leadPhone = normalizePhoneNumber(lead.phone_number);
            const callPhone = normalizePhoneNumber(call.lead_phone_number);
            
            if (isDebugLead) {
              console.log('Phone match attempt:', {
                leadPhone: leadPhone,
                callPhone: callPhone,
                match: leadPhone && callPhone && leadPhone === callPhone && leadPhone.length >= 10
              });
            }
            
            if (leadPhone && callPhone && leadPhone === callPhone && leadPhone.length >= 10) {
              return true;
            }
          }
          
          return false;
        });
        
        const actualCallsCount = matchingCalls.length;
        
        // Find the most recent appointment for this lead
        const leadAppointments = (appointmentsData || []).filter(
          appt => {
            // Priority 1: Match by phone number (use same normalization function)
            if (lead.phone_number && appt.lead_phone_number) {
              const leadPhone = normalizePhoneNumber(lead.phone_number);
              const apptPhone = normalizePhoneNumber(appt.lead_phone_number);
              if (leadPhone && apptPhone && leadPhone === apptPhone && leadPhone.length >= 10) return true;
            }
            
            // Priority 2: Match by email
            if (lead.email && appt.lead_email && 
                lead.email.toLowerCase().trim() === appt.lead_email.toLowerCase().trim()) {
              return true;
            }
            
            // Priority 3: Match by contact_id/ghl_id (case-insensitive)
            if (lead.contact_id && appt.ghl_id) {
              const leadId = lead.contact_id.toLowerCase().trim();
              const apptId = appt.ghl_id.toLowerCase().trim();
              if (leadId === apptId) return true;
            }
            
            // Fallback: Exact name match
            const nameMatch = appt.lead_name.toLowerCase().trim() === lead.lead_name.toLowerCase().trim();
            if (nameMatch) return true;
            
            return false;
          }
        );
        
        const mostRecentAppointment = leadAppointments.length > 0 ? leadAppointments[0] : null;
        
        // Debug log for specific leads
        if (lead.lead_name === 'AnaMaria DaSilva' || lead.lead_name === 'Tricia Norwood') {
          console.log(`${lead.lead_name} debug:`, {
            contact_id: lead.contact_id,
            phone_number: lead.phone_number,
            matchingCallsCount: actualCallsCount,
            totalCallsInDatabase: (callsData || []).length,
            callsWithSameProject: (callsData || []).filter(call => call.project_name === lead.project_name).length,
            matchingCalls: matchingCalls.length > 0 ? matchingCalls.map(call => ({
              ghl_id: call.ghl_id,
              phone: call.lead_phone_number,
              project: call.project_name
            })) : 'No matches found'
          });
        }

        return {
          ...lead,
          actual_calls_count: actualCallsCount,
          appointment_info: mostRecentAppointment
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
      // Find the lead to get phone number and contact_id for matching
      const lead = leads.find(l => l.lead_name === leadName);
      
      if (!lead) {
        console.error('Lead not found:', leadName);
        return;
      }
      
      // Get all calls and filter client-side for better matching control
      const { data: allCallsData, error } = await supabase
        .from('all_calls')
        .select('*')
        .order('call_datetime', { ascending: false });
      
      if (error) throw error;
      
      // Helper function to normalize phone numbers (same as in fetchLeadsWithCallCounts)
      const normalizePhoneNumber = (phone: string | null | undefined): string => {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        // For US numbers starting with '1', remove the '1' prefix to get 10-digit number
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
          return cleaned.slice(1);
        }
        return cleaned;
      };
      
      // Filter calls using consistent matching logic
      const matchingCalls = (allCallsData || []).filter(call => {
        // Primary: Match by contact_id/ghl_id (case-insensitive)
        if (lead.contact_id && call.ghl_id) {
          const leadId = lead.contact_id.toLowerCase().trim();
          const callId = call.ghl_id.toLowerCase().trim();
          if (leadId === callId) {
            return true;
          }
        }
        
        // Secondary: Match by phone number
        if (lead.phone_number && call.lead_phone_number) {
          const leadPhone = normalizePhoneNumber(lead.phone_number);
          const callPhone = normalizePhoneNumber(call.lead_phone_number);
          
          if (leadPhone && callPhone && leadPhone === callPhone && leadPhone.length >= 10) {
            return true;
          }
        }
        
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
    fetchLeadsWithCallCounts(1);
  }, [projectFilter, dateRange, nameSearch]);

  useEffect(() => {
    fetchLeadsWithCallCounts(currentPage);
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
    fetchLeadsWithCallCounts,
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
