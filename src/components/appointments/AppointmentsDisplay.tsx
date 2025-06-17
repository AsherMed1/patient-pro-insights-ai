
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AllAppointment } from './types';
import AppointmentsHeader from './AppointmentsHeader';
import AppointmentsStats from './AppointmentsStats';
import AppointmentsTabs from './AppointmentsTabs';
import AppointmentsPagination from './AppointmentsPagination';

interface AppointmentsDisplayProps {
  appointments: AllAppointment[];
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
}

interface FilterState {
  status: string | null;
  date: Date | null;
  dateRange: { start: Date | null; end: Date | null };
}

const AppointmentsDisplay = ({
  appointments,
  loading,
  projectFilter,
  isProjectPortal = false,
  currentPage,
  totalPages,
  totalRecords,
  recordsPerPage,
  onUpdateStatus,
  onUpdateProcedure,
  onPageChange
}: AppointmentsDisplayProps) => {
  // For project portal, default to future tab instead of all
  const [activeTab, setActiveTab] = useState(isProjectPortal ? "future" : "all");
  const [filters, setFilters] = useState<FilterState>({
    status: null,
    date: null,
    dateRange: { start: null, end: null }
  });

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

  const applyFilters = (appointmentsList: AllAppointment[]) => {
    let filtered = [...appointmentsList];

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
          appointments={filteredAppointments} 
          isProjectPortal={isProjectPortal} 
        />
        
        <AppointmentsTabs
          appointments={filteredAppointments}
          loading={loading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
          isProjectPortal={isProjectPortal}
          onStatusFilter={handleStatusFilter}
          onDateFilter={handleDateFilter}
          onDateRangeFilter={handleDateRangeFilter}
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
