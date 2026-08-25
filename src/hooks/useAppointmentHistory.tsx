import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const HISTORY_COLUMNS =
  'id, date_of_appointment, date_appointment_created, requested_time, calendar_name, project_name, status, is_reserved_block, is_superseded, lead_name';

export interface AppointmentHistoryEntry {
  id: string;
  date_of_appointment: string | null;
  date_appointment_created: string | null;
  requested_time: string | null;
  calendar_name: string | null;
  project_name: string | null;
  status: string | null;
  is_reserved_block: boolean | null;
  is_superseded: boolean | null;
  lead_name: string | null;
}

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
    queryFn: async (): Promise<AppointmentHistoryEntry[]> => {
      // Strategy 1: Match by ghl_id (highest priority)
      if (ghlId) {
        const { data, error } = await supabase
          .from('all_appointments')
          .select(HISTORY_COLUMNS)
          .eq('ghl_id', ghlId)
          .neq('is_reserved_block', true)
          .order('date_appointment_created', { ascending: false, nullsFirst: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          return data as unknown as AppointmentHistoryEntry[];
        }
      }

      // Strategy 2: Match by phone within same project
      if (phone) {
        const { data, error } = await supabase
          .from('all_appointments')
          .select(HISTORY_COLUMNS)
          .eq('lead_phone_number', phone)
          .eq('project_name', projectName)
          .neq('is_reserved_block', true)
          .order('date_appointment_created', { ascending: false, nullsFirst: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          return data as unknown as AppointmentHistoryEntry[];
        }
      }

      // Strategy 3: Match by name + project
      const { data, error } = await supabase
        .from('all_appointments')
        .select(HISTORY_COLUMNS)
        .ilike('lead_name', leadName.trim())
        .eq('project_name', projectName)
        .neq('is_reserved_block', true)
        .order('date_appointment_created', { ascending: false, nullsFirst: false })
        .limit(20);

      if (error) {
        console.error('Error fetching appointment history:', error);
        return [];
      }

      return (data || []) as unknown as AppointmentHistoryEntry[];
    },
    staleTime: 30000,
  });
};
