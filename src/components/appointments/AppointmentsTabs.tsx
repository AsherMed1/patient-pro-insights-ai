
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AllAppointment } from './types';
import { filterAppointments } from './utils';
import AppointmentsList from './AppointmentsList';
import { useIsMobile } from "@/hooks/use-mobile";
import { Calendar } from 'lucide-react';

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
    <div className="section-card animate-fade-in-up">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Appointment Management</h3>
      </div>
      
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className={`inline-flex w-full rounded-lg border border-border bg-transparent p-1 gap-1`}>
          <TabsTrigger 
            value="new" 
            className={`flex-1 rounded-md ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-2.5 text-sm'} font-medium transition-all data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground`}
          >
            New{displayCounts.new > 0 ? ` (${displayCounts.new})` : ''}
          </TabsTrigger>
          <TabsTrigger 
            value="needs-review" 
            className={`flex-1 rounded-md ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-2.5 text-sm'} font-medium transition-all data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground`}
          >
            Needs Review{displayCounts.needsReview > 0 ? ` (${displayCounts.needsReview})` : ''}
          </TabsTrigger>
          <TabsTrigger 
            value="future" 
            className={`flex-1 rounded-md ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-2.5 text-sm'} font-medium transition-all data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground`}
          >
            Upcoming{displayCounts.future > 0 ? ` (${displayCounts.future})` : ''}
          </TabsTrigger>
          <TabsTrigger 
            value="past" 
            className={`flex-1 rounded-md ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-2.5 text-sm'} font-medium transition-all data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground`}
          >
            Completed{displayCounts.past > 0 ? ` (${displayCounts.past})` : ''}
          </TabsTrigger>
          <TabsTrigger 
            value="all" 
            className={`flex-1 rounded-md ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-2.5 text-sm'} font-medium transition-all data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground`}
          >
            All{displayCounts.all > 0 ? ` (${displayCounts.all})` : ''}
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
    </div>
  );
};

export default AppointmentsTabs;
