
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { AllAppointment } from '@/components/appointments/types';

const RECORDS_PER_PAGE = 50;

export const useAppointments = (projectFilter?: string) => {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const { toast } = useToast();

  const totalPages = Math.ceil(totalRecords / RECORDS_PER_PAGE);

  const fetchAppointments = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // First get the total count
      let countQuery = supabase
        .from('all_appointments')
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

      let appointmentsQuery = supabase
        .from('all_appointments')
        .select(`
          id,
          date_appointment_created,
          date_of_appointment,
          project_name,
          lead_name,
          lead_email,
          lead_phone_number,
          calendar_name,
          requested_time,
          stage_booked,
          showed,
          confirmed,
          agent,
          agent_number,
          ghl_id,
          confirmed_number,
          created_at,
          updated_at,
          status,
          procedure_ordered
        `)
        .order('date_appointment_created', { ascending: false })
        .range(from, to);

      if (projectFilter) {
        appointmentsQuery = appointmentsQuery.eq('project_name', projectFilter);
      }

      const { data, error } = await appointmentsQuery;
      if (error) throw error;
      
      setAppointments(data || []);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          status,
          showed: status === 'Showed' ? true : status === 'No Show' ? false : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? {
              ...appointment,
              status,
              showed: status === 'Showed' ? true : status === 'No Show' ? false : null
            }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Appointment status updated successfully"
      });
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    }
  };

  const updateProcedureOrdered = async (appointmentId: string, procedureOrdered: boolean) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          procedure_ordered: procedureOrdered,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, procedure_ordered: procedureOrdered }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Procedure information updated successfully"
      });
    } catch (error) {
      console.error('Error updating procedure information:', error);
      toast({
        title: "Error",
        description: "Failed to update procedure information",
        variant: "destructive"
      });
    }
  };

  const handlePageChange = (page: number) => {
    fetchAppointments(page);
  };

  useEffect(() => {
    fetchAppointments(1);
    setCurrentPage(1);
  }, [projectFilter]);

  return {
    appointments,
    loading,
    currentPage,
    totalPages,
    totalRecords,
    recordsPerPage: RECORDS_PER_PAGE,
    fetchAppointments,
    updateAppointmentStatus,
    updateProcedureOrdered,
    handlePageChange
  };
};
