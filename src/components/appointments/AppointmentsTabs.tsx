import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AllAppointment } from './types';
import { filterAppointments } from './utils';
import AppointmentsList from './AppointmentsList';
interface AppointmentsTabsProps {
  appointments: AllAppointment[];
  loading: boolean;
  activeTab: string;
  onTabChange: (value: string) => void;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
  isProjectPortal?: boolean;
}
const AppointmentsTabs = ({
  appointments,
  loading,
  activeTab,
  onTabChange,
  projectFilter,
  onUpdateStatus,
  onUpdateProcedure,
  isProjectPortal = false
}: AppointmentsTabsProps) => {
  const futureAppointments = filterAppointments(appointments, 'future', isProjectPortal);
  const pastAppointments = filterAppointments(appointments, 'past', isProjectPortal);
  const needsReviewAppointments = filterAppointments(appointments, 'needs-review', isProjectPortal);
  const cancelledAppointments = filterAppointments(appointments, 'cancelled', isProjectPortal);
  return <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="needs-review" className="relative">
          Needs Review
          {needsReviewAppointments.length > 0 && <Badge variant="destructive" className="ml-2 text-xs">
              {needsReviewAppointments.length}
            </Badge>}
        </TabsTrigger>
        <TabsTrigger value="future" className="relative">
          Future
          
        </TabsTrigger>
        <TabsTrigger value="past" className="relative">
          Past
          
        </TabsTrigger>
        <TabsTrigger value="cancelled" className="relative">
          Cancelled
          
        </TabsTrigger>
      </TabsList>

      <TabsContent value="needs-review" className="mt-4">
        <AppointmentsList appointments={needsReviewAppointments} loading={loading} projectFilter={projectFilter} onUpdateStatus={onUpdateStatus} onUpdateProcedure={onUpdateProcedure} />
      </TabsContent>

      <TabsContent value="future" className="mt-4">
        <AppointmentsList appointments={futureAppointments} loading={loading} projectFilter={projectFilter} onUpdateStatus={onUpdateStatus} onUpdateProcedure={onUpdateProcedure} />
      </TabsContent>

      <TabsContent value="past" className="mt-4">
        <AppointmentsList appointments={pastAppointments} loading={loading} projectFilter={projectFilter} onUpdateStatus={onUpdateStatus} onUpdateProcedure={onUpdateProcedure} />
      </TabsContent>

      <TabsContent value="cancelled" className="mt-4">
        <AppointmentsList appointments={cancelledAppointments} loading={loading} projectFilter={projectFilter} onUpdateStatus={onUpdateStatus} onUpdateProcedure={onUpdateProcedure} />
      </TabsContent>
    </Tabs>;
};
export default AppointmentsTabs;