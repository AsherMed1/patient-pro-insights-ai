
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
  statusOptions: string[];
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureStatus: string | null) => void;
  onUpdateDate: (appointmentId: string, date: string | null) => void;
  onUpdateTime: (appointmentId: string, time: string | null) => void;
  onUpdateInternalProcess?: (appointmentId: string, isComplete: boolean) => void;
  onUpdateDOB?: (appointmentId: string, dob: string | null) => void;
  onDelete?: (appointmentId: string) => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onUpdateName?: (appointmentId: string, name: string) => void;
  onUpdateEmail?: (appointmentId: string, email: string) => void;
  onUpdatePhone?: (appointmentId: string, phone: string) => void;
  onUpdateCalendarLocation?: (appointmentId: string, location: string) => void;
  tabCounts?: {
    all: number;
    new: number;
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
  statusOptions,
  onUpdateStatus,
  onUpdateProcedure,
  onUpdateDate,
  onUpdateTime,
  onUpdateInternalProcess,
  onUpdateDOB,
  onDelete,
  onBulkDelete,
  onUpdateName,
  onUpdateEmail,
  onUpdatePhone,
  onUpdateCalendarLocation,
  tabCounts
}: AppointmentsTabsProps) => {
  const isMobile = useIsMobile();
  
  // No filtering needed - the backend already handles tab-specific filtering
  const displayedAppointments = appointments;

  // Use tabCounts if provided, otherwise fall back to current appointment count
  const displayCounts = tabCounts || {
    all: activeTab === 'all' ? appointments.length : 0,
    new: activeTab === 'new' ? appointments.length : 0,
    needsReview: activeTab === 'needs-review' ? appointments.length : 0,
    future: activeTab === 'future' ? appointments.length : 0,
    past: activeTab === 'past' ? appointments.length : 0
  };

  return (
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full animate-fade-in-up">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 h-auto gap-1' : 'grid-cols-5'} bg-muted/40 p-1.5 rounded-xl`}>
          <TabsTrigger 
            value="new" 
            className={`${isMobile ? 'w-full py-3.5 text-sm justify-start px-4' : 'py-2.5 text-sm'} rounded-xl text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-lg data-[state=active]:-translate-y-0.5`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="font-medium">New</span>
              <Badge variant={displayCounts.new > 0 ? "default" : "secondary"} className="text-[10px] h-5 min-w-[20px] justify-center">
                {displayCounts.new}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="needs-review" 
            className={`${isMobile ? 'w-full py-3.5 text-sm justify-start px-4' : 'py-2.5 text-sm'} rounded-xl text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-lg data-[state=active]:-translate-y-0.5`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span className="font-medium">Needs Review</span>
              <Badge variant={displayCounts.needsReview > 0 ? "destructive" : "secondary"} className="text-[10px] h-5 min-w-[20px] justify-center">
                {displayCounts.needsReview}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="future" 
            className={`${isMobile ? 'w-full py-3.5 text-sm justify-start px-4' : 'py-2.5 text-sm'} rounded-xl text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-lg data-[state=active]:-translate-y-0.5`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="font-medium">Upcoming</span>
              <Badge variant="secondary" className="text-[10px] h-5 min-w-[20px] justify-center">
                {displayCounts.future}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="past" 
            className={`${isMobile ? 'w-full py-3.5 text-sm justify-start px-4' : 'py-2.5 text-sm'} rounded-xl text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-lg data-[state=active]:-translate-y-0.5`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="font-medium">Completed</span>
              <Badge variant="secondary" className="text-[10px] h-5 min-w-[20px] justify-center">
                {displayCounts.past}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="all" 
            className={`${isMobile ? 'w-full py-3.5 text-sm justify-start px-4' : 'py-2.5 text-sm'} rounded-xl text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-lg data-[state=active]:-translate-y-0.5`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500 flex-shrink-0" />
              <span className="font-medium">All</span>
              <Badge variant="secondary" className="text-[10px] h-5 min-w-[20px] justify-center">
                {displayCounts.all}
              </Badge>
            </div>
          </TabsTrigger>
        </TabsList>

      <TabsContent value="all" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={displayedAppointments}
          loading={loading}
          projectFilter={projectFilter}
          statusOptions={statusOptions}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
          onUpdateDate={onUpdateDate}
          onUpdateTime={onUpdateTime}
          onUpdateInternalProcess={onUpdateInternalProcess}
          onUpdateDOB={onUpdateDOB}
          onDelete={onDelete}
          onBulkDelete={onBulkDelete}
          onUpdateName={onUpdateName}
          onUpdateEmail={onUpdateEmail}
          onUpdatePhone={onUpdatePhone}
          onUpdateCalendarLocation={onUpdateCalendarLocation}
        />
      </TabsContent>

      <TabsContent value="new" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={displayedAppointments}
          loading={loading}
          projectFilter={projectFilter}
          statusOptions={statusOptions}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
          onUpdateDate={onUpdateDate}
          onUpdateTime={onUpdateTime}
          onUpdateInternalProcess={onUpdateInternalProcess}
          onUpdateDOB={onUpdateDOB}
          onDelete={onDelete}
          onBulkDelete={onBulkDelete}
          onUpdateName={onUpdateName}
          onUpdateEmail={onUpdateEmail}
          onUpdatePhone={onUpdatePhone}
          onUpdateCalendarLocation={onUpdateCalendarLocation}
        />
      </TabsContent>

      <TabsContent value="needs-review" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={displayedAppointments}
          loading={loading}
          projectFilter={projectFilter}
          statusOptions={statusOptions}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
          onUpdateDate={onUpdateDate}
          onUpdateTime={onUpdateTime}
          onUpdateInternalProcess={onUpdateInternalProcess}
          onUpdateDOB={onUpdateDOB}
          onDelete={onDelete}
          onBulkDelete={onBulkDelete}
          onUpdateName={onUpdateName}
          onUpdateEmail={onUpdateEmail}
          onUpdatePhone={onUpdatePhone}
          onUpdateCalendarLocation={onUpdateCalendarLocation}
        />
      </TabsContent>

      <TabsContent value="future" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={displayedAppointments}
          loading={loading}
          projectFilter={projectFilter}
          statusOptions={statusOptions}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
          onUpdateDate={onUpdateDate}
          onUpdateTime={onUpdateTime}
          onUpdateInternalProcess={onUpdateInternalProcess}
          onUpdateDOB={onUpdateDOB}
          onDelete={onDelete}
          onBulkDelete={onBulkDelete}
          onUpdateName={onUpdateName}
          onUpdateEmail={onUpdateEmail}
          onUpdatePhone={onUpdatePhone}
          onUpdateCalendarLocation={onUpdateCalendarLocation}
        />
      </TabsContent>

      <TabsContent value="past" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
        <AppointmentsList
          appointments={displayedAppointments}
          loading={loading}
          projectFilter={projectFilter}
          statusOptions={statusOptions}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
          onUpdateDate={onUpdateDate}
          onUpdateTime={onUpdateTime}
          onUpdateInternalProcess={onUpdateInternalProcess}
          onUpdateDOB={onUpdateDOB}
          onDelete={onDelete}
          onBulkDelete={onBulkDelete}
          onUpdateName={onUpdateName}
          onUpdateEmail={onUpdateEmail}
          onUpdatePhone={onUpdatePhone}
          onUpdateCalendarLocation={onUpdateCalendarLocation}
        />
      </TabsContent>
      </Tabs>
  );
};

export default AppointmentsTabs;
