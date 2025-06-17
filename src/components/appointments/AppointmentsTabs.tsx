
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AllAppointment } from './types';
import { filterAppointments } from './utils';
import AppointmentsList from './AppointmentsList';
import AppointmentsFilters from './AppointmentsFilters';

interface AppointmentsTabsProps {
  appointments: AllAppointment[];
  totalCounts: {
    all: number;
    future: number;
    past: number;
    needsReview: number;
    cancelled: number;
  };
  loading: boolean;
  activeTab: string;
  onTabChange: (value: string) => void;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
  isProjectPortal?: boolean;
  onStatusFilter?: (status: string | null) => void;
  onDateFilter?: (date: Date | null) => void;
  onDateRangeFilter?: (startDate: Date | null, endDate: Date | null) => void;
}

const AppointmentsTabs = ({
  appointments,
  totalCounts,
  loading,
  activeTab,
  onTabChange,
  projectFilter,
  onUpdateStatus,
  onUpdateProcedure,
  isProjectPortal = false,
  onStatusFilter,
  onDateFilter,
  onDateRangeFilter
}: AppointmentsTabsProps) => {
  // Filter the current page's appointments for display
  const futureAppointments = filterAppointments(appointments, 'future', isProjectPortal);
  const pastAppointments = filterAppointments(appointments, 'past', isProjectPortal);
  const needsReviewAppointments = filterAppointments(appointments, 'needs-review', isProjectPortal);
  const cancelledAppointments = filterAppointments(appointments, 'cancelled', isProjectPortal);

  // For project portal, default to future tab if all tab is selected
  const currentTab = isProjectPortal && activeTab === "all" ? "future" : activeTab;

  return (
    <Tabs value={currentTab} onValueChange={onTabChange} className="w-full">
      <TabsList className={`grid w-full ${isProjectPortal ? 'grid-cols-4' : 'grid-cols-5'}`}>
        {!isProjectPortal && (
          <TabsTrigger value="all" className="relative">
            All
            <Badge variant="outline" className="ml-2 text-xs">
              {totalCounts.all}
            </Badge>
          </TabsTrigger>
        )}
        <TabsTrigger value="future" className="relative">
          Future
          {totalCounts.future > 0 && (
            <Badge variant="outline" className="ml-2 text-xs">
              {totalCounts.future}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="past" className="relative">
          Past
          {totalCounts.past > 0 && (
            <Badge variant="outline" className="ml-2 text-xs">
              {totalCounts.past}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="needs-review" className="relative">
          Needs Review
          {totalCounts.needsReview > 0 && (
            <Badge variant="destructive" className="ml-2 text-xs">
              {totalCounts.needsReview}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="cancelled" className="relative">
          Cancelled
          {totalCounts.cancelled > 0 && (
            <Badge variant="outline" className="ml-2 text-xs">
              {totalCounts.cancelled}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {!isProjectPortal && (
        <TabsContent value="all" className="mt-4">
          <AppointmentsFilters
            onStatusFilter={onStatusFilter}
            onDateFilter={onDateFilter}
            onDateRangeFilter={onDateRangeFilter}
          />
          <AppointmentsList
            appointments={appointments}
            loading={loading}
            projectFilter={projectFilter}
            onUpdateStatus={onUpdateStatus}
            onUpdateProcedure={onUpdateProcedure}
          />
        </TabsContent>
      )}

      <TabsContent value="future" className="mt-4">
        <AppointmentsList
          appointments={futureAppointments}
          loading={loading}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      </TabsContent>

      <TabsContent value="past" className="mt-4">
        <AppointmentsList
          appointments={pastAppointments}
          loading={loading}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      </TabsContent>

      <TabsContent value="needs-review" className="mt-4">
        <AppointmentsList
          appointments={needsReviewAppointments}
          loading={loading}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />
      </TabsContent>

      <TabsContent value="cancelled" className="mt-4">
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
