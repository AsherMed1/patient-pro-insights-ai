
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllAppointment } from './types';
import AppointmentsTabs from './AppointmentsTabs';

interface AppointmentsDisplayProps {
  appointments: AllAppointment[];
  loading: boolean;
  projectFilter?: string;
  isProjectPortal?: boolean;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
}

const AppointmentsDisplay = ({
  appointments,
  loading,
  projectFilter,
  isProjectPortal = false,
  onUpdateStatus,
  onUpdateProcedure
}: AppointmentsDisplayProps) => {
  const [activeTab, setActiveTab] = useState("needs-review");

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 md:pb-6">
        <CardTitle className="text-lg md:text-xl">
          {projectFilter ? `${projectFilter} - All Appointments` : 'All Appointments'}
        </CardTitle>
        <CardDescription className="text-sm">
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} recorded (Times in Central Time Zone)
          {projectFilter && ` for ${projectFilter}`}
          {isProjectPortal && ' (Only confirmed appointments shown)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0">
        <AppointmentsTabs
          appointments={appointments}
          loading={loading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
          isProjectPortal={isProjectPortal}
        />
      </CardContent>
    </Card>
  );
};

export default AppointmentsDisplay;
