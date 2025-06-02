
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

  return (
    <div className="space-y-3 md:space-y-4">
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
