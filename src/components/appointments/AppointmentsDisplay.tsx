
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AllAppointment } from './types';
import AppointmentsHeader from './AppointmentsHeader';
import AppointmentsStats from './AppointmentsStats';
import AppointmentsTabs from './AppointmentsTabs';
import AppointmentsPagination from './AppointmentsPagination';
import { supabase } from '@/integrations/supabase/client';

interface AppointmentsDisplayProps {
  appointments: AllAppointment[];
  totalCounts: {
    all: number;
    future: number;
    past: number;
    needsReview: number;
    cancelled: number;
  };
  loading: boolean;
  projectFilter?: string;
  isProjectPortal?: boolean;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  recordsPerPage: number;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
  onPageChange: (page: number) => void;
  onTabChange: (filter: string) => void;
}

interface FilterState {
  status: string | null;
  date: Date | null;
  dateRange: { start: Date | null; end: Date | null };
  search: string;
  tag: string | null;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
}

const AppointmentsDisplay = ({
  appointments,
  totalCounts,
  loading,
  projectFilter,
  isProjectPortal = false,
  currentPage,
  totalPages,
  totalRecords,
  recordsPerPage,
  onUpdateStatus,
  onUpdateProcedure,
  onPageChange,
  onTabChange
}: AppointmentsDisplayProps) => {
  // For project portal, default to future tab instead of all
  const [activeTab, setActiveTab] = useState(isProjectPortal ? "future" : "all");
  const [filters, setFilters] = useState<FilterState>({
    status: null,
    date: null,
    dateRange: { start: null, end: null },
    search: '',
    tag: null,
    sortBy: null,
    sortOrder: 'asc'
  });
  const [taggedAppointmentIds, setTaggedAppointmentIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange(tab);
  };

  const handleStatusFilter = (status: string | null) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const handleDateFilter = (date: Date | null) => {
    setFilters(prev => ({ ...prev, date }));
  };

  const handleDateRangeFilter = (startDate: Date | null, endDate: Date | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { start: startDate, end: endDate }
    }));
  };

  const handleSearchFilter = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
  };

  const handleSortChange = (sortBy: string | null, sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
  };

  const handleTagFilter = async (tagId: string | null) => {
    setFilters(prev => ({ ...prev, tag: tagId }));
    
    if (tagId) {
      try {
        // Fetch appointment IDs that have this tag
        const { data, error } = await supabase
          .from('appointment_tags')
          .select('appointment_id')
          .eq('project_tag_id', tagId);

        if (error) throw error;

        const appointmentIds = data?.map(item => item.appointment_id) || [];
        setTaggedAppointmentIds(appointmentIds);
      } catch (error) {
        console.error('Error fetching tagged appointments:', error);
        setTaggedAppointmentIds([]);
      }
    } else {
      setTaggedAppointmentIds([]);
    }
  };

  const applyFilters = (appointmentsList: AllAppointment[]) => {
    let filtered = [...appointmentsList];

    // Apply search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(appointment => 
        appointment.lead_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(appointment => {
        // Check the status field first
        if (appointment.status && appointment.status.toLowerCase() === filters.status!.toLowerCase()) {
          return true;
        }
        
        // For "Confirmed" status, also check the confirmed boolean field
        if (filters.status.toLowerCase() === 'confirmed' && appointment.confirmed === true) {
          return true;
        }
        
        return false;
      });
    }

    // Apply tag filter
    if (filters.tag && taggedAppointmentIds.length > 0) {
      filtered = filtered.filter(appointment => 
        taggedAppointmentIds.includes(appointment.id)
      );
    }

    // Apply single date filter
    if (filters.date) {
      const filterDate = filters.date.toISOString().split('T')[0];
      filtered = filtered.filter(appointment => {
        if (!appointment.date_of_appointment) return false;
        const appointmentDate = new Date(appointment.date_of_appointment).toISOString().split('T')[0];
        return appointmentDate === filterDate;
      });
    }

    // Apply date range filter
    if (filters.dateRange.start && filters.dateRange.end) {
      const startDate = filters.dateRange.start.toISOString().split('T')[0];
      const endDate = filters.dateRange.end.toISOString().split('T')[0];
      
      filtered = filtered.filter(appointment => {
        if (!appointment.date_of_appointment) return false;
        const appointmentDate = new Date(appointment.date_of_appointment).toISOString().split('T')[0];
        return appointmentDate >= startDate && appointmentDate <= endDate;
      });
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (filters.sortBy === 'date_of_appointment') {
          aValue = a.date_of_appointment ? new Date(a.date_of_appointment).getTime() : 0;
          bValue = b.date_of_appointment ? new Date(b.date_of_appointment).getTime() : 0;
        } else if (filters.sortBy === 'date_appointment_created') {
          aValue = new Date(a.date_appointment_created).getTime();
          bValue = new Date(b.date_appointment_created).getTime();
        } else {
          return 0;
        }

        if (filters.sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }

    return filtered;
  };

  const filteredAppointments = applyFilters(appointments);

  return (
    <Card className="w-full">
      <AppointmentsHeader
        projectFilter={projectFilter}
        totalRecords={totalRecords}
        filteredCount={filteredAppointments.length}
        isProjectPortal={isProjectPortal}
      />
      
      <CardContent className="p-4 md:p-6 pt-0 space-y-6">
        <AppointmentsStats 
          totalCounts={totalCounts}
          isProjectPortal={isProjectPortal} 
        />
        
        <AppointmentsTabs
          appointments={filteredAppointments}
          totalCounts={totalCounts}
          loading={loading}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
          isProjectPortal={isProjectPortal}
          onStatusFilter={handleStatusFilter}
          onDateFilter={handleDateFilter}
          onDateRangeFilter={handleDateRangeFilter}
          onSearchFilter={handleSearchFilter}
          onTagFilter={handleTagFilter}
          onSortChange={handleSortChange}
          searchTerm={filters.search}
          selectedStatus={filters.status}
          selectedDate={filters.date}
          dateRange={filters.dateRange}
          selectedTag={filters.tag}
          availableTags={availableTags}
        />
        
        <AppointmentsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          recordsPerPage={recordsPerPage}
          onPageChange={onPageChange}
        />
      </CardContent>
    </Card>
  );
};

export default AppointmentsDisplay;
