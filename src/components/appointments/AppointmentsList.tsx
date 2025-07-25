
import React, { useState, useMemo } from 'react';
import { AllAppointment } from './types';
import AppointmentCard from './AppointmentCard';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AppointmentsListProps {
  appointments: AllAppointment[];
  loading: boolean;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
}

const AppointmentsList = ({
  appointments,
  loading,
  projectFilter,
  onUpdateStatus,
  onUpdateProcedure
}: AppointmentsListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const { paginatedAppointments, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      paginatedAppointments: appointments.slice(startIndex, endIndex),
      totalPages: Math.ceil(appointments.length / itemsPerPage)
    };
  }, [appointments, currentPage]);

  // Reset to page 1 when appointments change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [appointments.length]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading appointments...</div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No appointments found for this category</div>
      </div>
    );
  }

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Pagination Info */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, appointments.length)} of {appointments.length} appointments
        </span>
        <span>
          Page {currentPage} of {totalPages}
        </span>
      </div>

      {/* Appointments List */}
      <div className="space-y-3 md:space-y-4">
        {paginatedAppointments.map(appointment => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            projectFilter={projectFilter}
            onUpdateStatus={onUpdateStatus}
            onUpdateProcedure={onUpdateProcedure}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {getPageNumbers().map(pageNum => (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              onClick={() => goToPage(pageNum)}
            >
              {pageNum}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AppointmentsList;
