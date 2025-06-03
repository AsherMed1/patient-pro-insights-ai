
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllAppointment } from './types';
import { filterAppointments } from './utils';
import AppointmentsList from './AppointmentsList';
import { useIsMobile } from "@/hooks/use-mobile";

interface AppointmentsTabsProps {
  appointments: AllAppointment[];
  loading: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
}

const AppointmentsTabs = ({
  appointments,
  loading,
  activeTab,
  onTabChange,
  projectFilter,
  onUpdateStatus,
  onUpdateProcedure
}: AppointmentsTabsProps) => {
  const isMobile = useIsMobile();
  
  const futureAppointments = filterAppointments(appointments, 'future');
  const pastAppointments = filterAppointments(appointments, 'past');
  const needsReviewAppointments = filterAppointments(appointments, 'needs-review');
  const cancelledAppointments = filterAppointments(appointments, 'cancelled');

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 h-auto p-1' : 'grid-cols-4'}`}>
        <TabsTrigger 
          value="needs-review" 
          className={`${isMobile ? 'w-full mb-1 py-3 text-sm' : 'text-xs md:text-sm'}`}
        >
          Needs Review ({needsReviewAppointments.length})
        </TabsTrigger>
        <TabsTrigger 
          value="future" 
          className={`${isMobile ? 'w-full mb-1 py-3 text-sm' : 'text-xs md:text-sm'}`}
        >
          Future ({futureAppointments.length})
        </TabsTrigger>
        <TabsTrigger 
          value="past" 
          className={`${isMobile ? 'w-full mb-1 py-3 text-sm' : 'text-xs md:text-sm'}`}
        >
          Past ({pastAppointments.length})
        </TabsTrigger>
        <TabsTrigger 
          value="cancelled" 
          className={`${isMobile ? 'w-full py-3 text-sm' : 'text-xs md:text-sm'}`}
        >
          Cancelled ({cancelledAppointments.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="needs-review" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={needsReviewAppointments}
          loading={loading}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      </TabsContent>

      <TabsContent value="future" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={futureAppointments}
          loading={loading}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      </TabsContent>

      <TabsContent value="past" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={pastAppointments}
          loading={loading}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      </TabsContent>

      <TabsContent value="cancelled" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={cancelledAppointments}
          loading={loading}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      </TabsContent>
    </Tabs>
  );
};

export default AppointmentsTabs;
