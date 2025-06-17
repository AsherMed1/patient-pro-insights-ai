
import React from 'react';
import { AllAppointment } from './types';
import AppointmentCard from './AppointmentCard';

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
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div className="text-muted-foreground">Loading appointments...</div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground text-lg mb-2">No appointments found</div>
        <div className="text-sm text-muted-foreground">
          Try adjusting your filters or check a different category
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map(appointment => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      ))}
    </div>
  );
};

export default AppointmentsList;
