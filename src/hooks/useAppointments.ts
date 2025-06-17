
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AllAppointment } from '@/components/appointments/types';

export const useAppointments = (projectFilter?: string, isProjectPortal: boolean = false) => {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [totalCounts, setTotalCounts] = useState({
    all: 0,
    future: 0,
    past: 0,
    needsReview: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 50;
  const { toast } = useToast();

  const fetchAllAppointmentsForCounting = async () => {
    try {
      let allRecords: AllAppointment[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      // Build base query
      let baseQuery = supabase.from('all_appointments').select('*');
      
      if (projectFilter) {
        baseQuery = baseQuery.eq('project_name', projectFilter);
      }

      // For project portals, filter confirmed appointments
      if (isProjectPortal) {
        baseQuery = baseQuery.or('confirmed.eq.true,status.ilike.confirmed');
      }

      // Fetch all records in batches
      while (hasMore) {
        const { data, error } = await baseQuery
          .range(from, from + batchSize - 1)
          .order('date_of_appointment', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allRecords = [...allRecords, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
          console.log(`Fetched appointments batch: ${data.length} records, total so far: ${allRecords.length}`);
        } else {
          hasMore = false;
        }
      }

      console.log(`Total appointments fetched for counting: ${allRecords.length}`);
      return allRecords;
    } catch (error) {
      console.error('Error fetching all appointments for counting:', error);
      return [];
    }
  };

  const fetchTotalCounts = async () => {
    try {
      const allAppointments = await fetchAllAppointmentsForCounting();
      
      // Calculate counts using the same logic as the filter functions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const counts = {
        all: allAppointments.length,
        future: 0,
        past: 0,
        needsReview: 0,
        cancelled: 0
      };

      allAppointments.forEach(appointment => {
        const appointmentDate = appointment.date_of_appointment ? new Date(appointment.date_of_appointment) : null;
        if (appointmentDate) {
          appointmentDate.setHours(0, 0, 0, 0);
        }
        
        const isPast = appointmentDate ? appointmentDate < today : false;
        const isFuture = appointmentDate ? appointmentDate >= today : false;
        const isCancelled = appointment.status && appointment.status.toLowerCase().trim() === 'cancelled';
        const hasStatus = appointment.status && appointment.status.trim() !== '';
        const hasProcedure = appointment.procedure_ordered !== null;

        if (isCancelled) {
          counts.cancelled++;
        } else if (isFuture) {
          counts.future++;
        } else if (isPast) {
          counts.past++;
          if (!hasStatus || !hasProcedure) {
            counts.needsReview++;
          }
        }
      });

      console.log('Total counts calculated:', counts);
      setTotalCounts(counts);
    } catch (error) {
      console.error('Error fetching total counts:', error);
    }
  };

  const fetchAppointments = async (page: number = 1) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('all_appointments')
        .select('*', { count: 'exact' })
        .order('date_of_appointment', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (projectFilter) {
        query = query.eq('project_name', projectFilter);
      }

      // For project portals, filter confirmed appointments at the database level
      if (isProjectPortal) {
        query = query.or('confirmed.eq.true,status.ilike.confirmed');
      }

      const { data, error, count } = await query
        .range((page - 1) * recordsPerPage, page * recordsPerPage - 1);

      if (error) throw error;

      const filteredData = data || [];

      setAppointments(filteredData);
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / recordsPerPage));
      setCurrentPage(page);

      // Fetch total counts for badges
      await fetchTotalCounts();
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
    totalCounts,
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
