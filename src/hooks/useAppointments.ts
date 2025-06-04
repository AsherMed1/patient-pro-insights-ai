import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AllAppointment } from '@/components/appointments/types';

export const useAppointments = (projectFilter?: string, isProjectPortal: boolean = false) => {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 50;
  const { toast } = useToast();

  const fetchAppointments = async (page: number = 1) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('all_appointments')
        .select('*', { count: 'exact' })
        .order('date_of_appointment', { ascending: false, nullsLast: true })
        .order('created_at', { ascending: false });

      if (projectFilter) {
        query = query.eq('project_name', projectFilter);
      }

      const { data, error, count } = await query
        .range((page - 1) * recordsPerPage, page * recordsPerPage - 1);

      if (error) throw error;

      let filteredData = data || [];

      // For project portals, only show confirmed appointments
      if (isProjectPortal) {
        filteredData = filteredData.filter(apt => {
          return apt.confirmed === true || 
                 (apt.status && apt.status.toLowerCase() === 'confirmed');
        });
      }

      setAppointments(filteredData);
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / recordsPerPage));
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [projectFilter]);

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });

      await fetchAppointments(currentPage);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
    }
  };

  const updateProcedureOrdered = async (appointmentId: string, procedureOrdered: boolean) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({ procedure_ordered: procedureOrdered, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Procedure status updated successfully",
      });

      await fetchAppointments(currentPage);
    } catch (error) {
      console.error('Error updating procedure status:', error);
      toast({
        title: "Error",
        description: "Failed to update procedure status",
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (page: number) => {
    fetchAppointments(page);
  };

  return {
    appointments,
    loading,
    currentPage,
    totalPages,
    totalRecords,
    recordsPerPage,
    fetchAppointments,
    updateAppointmentStatus,
    updateProcedureOrdered,
    handlePageChange
  };
};
