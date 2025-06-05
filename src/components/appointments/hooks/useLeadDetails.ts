
import { useState } from 'react';
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

export const useLeadDetails = () => {
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [leadData, setLeadData] = useState<NewLead | null>(null);
  const [loadingLeadData, setLoadingLeadData] = useState(false);
  const { toast } = useToast();

  const handleViewDetails = async (leadName: string, projectName: string) => {
    try {
      setLoadingLeadData(true);

      // Try to find the lead by exact name match first
      let {
        data,
        error
      } = await supabase.from('new_leads').select('*').eq('lead_name', leadName).eq('project_name', projectName).maybeSingle();
      if (error) throw error;

      // If no exact match, try case-insensitive search
      if (!data) {
        const {
          data: altData,
          error: altError
        } = await supabase.from('new_leads').select('*').ilike('lead_name', leadName).eq('project_name', projectName).maybeSingle();
        if (altError) throw altError;
        data = altData;
      }
      if (data) {
        setLeadData(data);
        setShowLeadDetails(true);
      } else {
        toast({
          title: "No Additional Details",
          description: "No additional lead information found for this appointment.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error fetching lead details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lead details",
        variant: "destructive"
      });
    } finally {
      setLoadingLeadData(false);
    }
  };

  return {
    showLeadDetails,
    setShowLeadDetails,
    leadData,
    loadingLeadData,
    handleViewDetails
  };
};
