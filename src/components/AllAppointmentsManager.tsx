
import React from 'react';
import { AllAppointmentsManagerProps } from './appointments/types';
import { useAppointments } from '@/hooks/useAppointments';
import AppointmentsImportSection from './appointments/AppointmentsImportSection';
import AppointmentsDisplay from './appointments/AppointmentsDisplay';

const AllAppointmentsManager = ({
  projectFilter,
  isProjectPortal = false
}: AllAppointmentsManagerProps) => {
  const {
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
  } = useAppointments(projectFilter);

  return (
    <div className="space-y-6">
      {/* Import Section - Only show in main dashboard, not project portals */}
      {!isProjectPortal && (
        <AppointmentsImportSection onImportComplete={() => fetchAppointments(1)} />
      )}

      {/* Appointments List */}
      <AppointmentsDisplay
        appointments={appointments}
        loading={loading}
        projectFilter={projectFilter}
        isProjectPortal={isProjectPortal}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        recordsPerPage={recordsPerPage}
        onUpdateStatus={updateAppointmentStatus}
        onUpdateProcedure={updateProcedureOrdered}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default AllAppointmentsManager;
