
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AllAppointment } from './types';
import { filterAppointments } from './utils';
import AppointmentsList from './AppointmentsList';
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertCircle, Calendar, Clock } from 'lucide-react';

interface AppointmentsTabsProps {
  appointments: AllAppointment[];
  loading: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
  tabCounts?: {
    needsReview: number;
    future: number;
    past: number;
  };
}

const AppointmentsTabs = ({
  appointments,
  loading,
  activeTab,
  onTabChange,
  projectFilter,
  onUpdateStatus,
  onUpdateProcedure,
  tabCounts
}: AppointmentsTabsProps) => {
  const isMobile = useIsMobile();
  
  // Since appointments are now filtered at the database level, 
  // we show all appointments for the active tab
  const displayedAppointments = appointments;

  // Use tabCounts if provided, otherwise fall back to current appointment count
  const displayCounts = tabCounts || {
    needsReview: activeTab === 'needs-review' ? appointments.length : 0,
    future: activeTab === 'future' ? appointments.length : 0,
    past: activeTab === 'past' ? appointments.length : 0
  };

  return (
    <div className="portal-section">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Appointment Management</h3>
      </div>
      
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 h-auto p-1 gap-1' : 'grid-cols-3'} bg-muted/50 p-1 rounded-lg`}>
          <TabsTrigger 
            value="needs-review" 
            className={`${isMobile ? 'w-full py-4 text-sm justify-start' : 'py-3 text-sm'} relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>Needs Review</span>
              <Badge variant={displayCounts.needsReview > 0 ? "destructive" : "secondary"} className="ml-auto">
                {displayCounts.needsReview}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="future" 
            className={`${isMobile ? 'w-full py-4 text-sm justify-start' : 'py-3 text-sm'} relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Upcoming</span>
              <Badge variant="secondary" className="ml-auto">
                {displayCounts.future}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="past" 
            className={`${isMobile ? 'w-full py-4 text-sm justify-start' : 'py-3 text-sm'} relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span>Completed</span>
              <Badge variant="secondary" className="ml-auto">
                {displayCounts.past}
              </Badge>
            </div>
          </TabsTrigger>
        </TabsList>

      <TabsContent value="needs-review" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={displayedAppointments}
          loading={loading}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      </TabsContent>

      <TabsContent value="future" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={displayedAppointments}
          loading={loading}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      </TabsContent>

      <TabsContent value="past" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={displayedAppointments}
          loading={loading}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppointmentsTabs;
