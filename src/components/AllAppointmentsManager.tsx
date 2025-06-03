
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
    fetchAppointments,
    updateAppointmentStatus,
    updateProcedureOrdered
  } = useAppointments(projectFilter);

  return (
    <div className="space-y-6">
      {/* Import Section - Only show in main dashboard, not project portals */}
      {!isProjectPortal && (
        <AppointmentsImportSection onImportComplete={fetchAppointments} />
      )}

      {/* Appointments List */}
      <AppointmentsDisplay
        appointments={appointments}
        loading={loading}
        projectFilter={projectFilter}
        isProjectPortal={isProjectPortal}
        onUpdateStatus={updateAppointmentStatus}
        onUpdateProcedure={updateProcedureOrdered}
      />
    </div>
  );
};

export default AllAppointmentsManager;
