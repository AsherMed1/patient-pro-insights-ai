
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllAppointment } from './types';
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
      <CardHeader className="pb-3 md:pb-6">
        <CardTitle className="text-lg md:text-xl">
          {projectFilter ? `${projectFilter} - All Appointments` : 'All Appointments'}
        </CardTitle>
        <CardDescription className="text-sm">
          {filteredAppointments.length} of {totalRecords} appointment{totalRecords !== 1 ? 's' : ''} shown (Times in Central Time Zone)
          {projectFilter && ` for ${projectFilter}`}
          {isProjectPortal && ' (Only confirmed appointments shown)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0">
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
