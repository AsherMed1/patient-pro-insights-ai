import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AllAppointment } from '@/components/appointments/types';

interface UseAppointmentHistoryParams {
  ghlId?: string | null;
  phone?: string | null;
  leadName: string;
  projectName: string;
  currentAppointmentId: string;
}

export const useAppointmentHistory = ({
  ghlId,
  phone,
  leadName,
  projectName,
  currentAppointmentId,
}: UseAppointmentHistoryParams) => {
  return useQuery({
    queryKey: ['appointment-history', currentAppointmentId, ghlId, phone, leadName, projectName],
    queryFn: async () => {
      // Strategy 1: Match by ghl_id (highest priority)
      if (ghlId) {
        const { data, error } = await supabase
          .from('all_appointments')
          .select('id, date_of_appointment, requested_time, calendar_name, project_name, status, is_reserved_block, lead_name')
          .eq('ghl_id', ghlId)
          .neq('is_reserved_block', true)
          .order('date_of_appointment', { ascending: false, nullsFirst: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          return data as Pick<AllAppointment, 'id' | 'date_of_appointment' | 'requested_time' | 'calendar_name' | 'project_name' | 'status' | 'is_reserved_block' | 'lead_name'>[];
        }
      }

      // Strategy 2: Match by phone within same project
      if (phone) {
        const { data, error } = await supabase
          .from('all_appointments')
          .select('id, date_of_appointment, requested_time, calendar_name, project_name, status, is_reserved_block, lead_name')
          .eq('lead_phone_number', phone)
          .eq('project_name', projectName)
          .neq('is_reserved_block', true)
          .order('date_of_appointment', { ascending: false, nullsFirst: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          return data as any[];
        }
      }

      // Strategy 3: Match by name + project
      const { data, error } = await supabase
        .from('all_appointments')
        .select('id, date_of_appointment, requested_time, calendar_name, project_name, status, is_reserved_block, lead_name')
        .ilike('lead_name', leadName.trim())
        .eq('project_name', projectName)
        .neq('is_reserved_block', true)
        .order('date_of_appointment', { ascending: false, nullsFirst: false })
        .limit(20);

      if (error) {
        console.error('Error fetching appointment history:', error);
        return [];
      }

      return (data || []) as any[];
    },
    staleTime: 30000,
  });
};
