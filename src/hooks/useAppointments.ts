
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AllAppointment } from '@/components/appointments/types';
import { useAppointmentCounts } from './appointments/useAppointmentCounts';
import { useAppointmentQueries } from './appointments/useAppointmentQueries';
import { useAppointmentOperations } from './appointments/useAppointmentOperations';

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
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const recordsPerPage = 50;
  const { toast } = useToast();

  const { calculateTotalCounts } = useAppointmentCounts();
  const { buildFilteredQuery } = useAppointmentQueries();
  const { updateAppointmentStatus: updateStatus, updateProcedureOrdered: updateProcedure } = useAppointmentOperations();

  const fetchAppointments = async (page: number = 1, filter: string | null = null) => {
    try {
      setLoading(true);
      setActiveFilter(filter);
      
      const query = buildFilteredQuery(filter, projectFilter, isProjectPortal);
      const { data, error, count } = await query
        .range((page - 1) * recordsPerPage, page * recordsPerPage - 1);

      if (error) throw error;

      const filteredData = data || [];

      setAppointments(filteredData);
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / recordsPerPage));
      setCurrentPage(page);

      // Only fetch total counts if not already loaded or if we're on the main view
      if (!filter) {
        const counts = await calculateTotalCounts(projectFilter, isProjectPortal);
        setTotalCounts(counts);
      }
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
    const success = await updateStatus(appointmentId, status);
    if (success) {
      await fetchAppointments(currentPage, activeFilter);
    }
  };

  const updateProcedureOrdered = async (appointmentId: string, procedureOrdered: boolean) => {
    const success = await updateProcedure(appointmentId, procedureOrdered);
    if (success) {
      await fetchAppointments(currentPage, activeFilter);
    }
  };

  const handlePageChange = (page: number) => {
    fetchAppointments(page, activeFilter);
  };

  const handleTabChange = (filter: string) => {
    const tabFilter = filter === 'all' ? null : filter;
    fetchAppointments(1, tabFilter);
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
    handlePageChange,
    handleTabChange
  };
};
