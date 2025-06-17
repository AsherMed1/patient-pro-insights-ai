
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AllAppointment } from './types';
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
  onTabChange: (tab: string) => void;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
  isProjectPortal?: boolean;
  onStatusFilter?: (status: string | null) => void;
  onDateFilter?: (date: Date | null) => void;
  onDateRangeFilter?: (startDate: Date | null, endDate: Date | null) => void;
  onSearchFilter?: (searchTerm: string) => void;
  onTagFilter?: (tagId: string | null) => void;
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
  onDateRangeFilter,
  onSearchFilter,
  onTagFilter
}: AppointmentsTabsProps) => {
  const tabs = [
    { id: 'all', label: 'All Appointments', count: totalCounts.all },
    { id: 'future', label: 'Future', count: totalCounts.future },
    { id: 'past', label: 'Past', count: totalCounts.past },
    { id: 'needs-review', label: 'Needs Review', count: totalCounts.needsReview },
    { id: 'cancelled', label: 'Cancelled', count: totalCounts.cancelled }
  ];

  // Filter tabs for project portal
  const visibleTabs = isProjectPortal ? tabs.filter(tab => tab.id !== 'all') : tabs;

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5">
        {visibleTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            <Badge variant="secondary" className="ml-1">
              {tab.count}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {visibleTabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="space-y-4">
          <AppointmentsFilters
            onStatusFilter={onStatusFilter}
            onDateFilter={onDateFilter}
            onDateRangeFilter={onDateRangeFilter}
            onSearchFilter={onSearchFilter}
            onTagFilter={onTagFilter}
            projectName={projectFilter}
          />
          
          <AppointmentsList
            appointments={appointments}
            loading={loading}
            projectFilter={projectFilter}
            onUpdateStatus={onUpdateStatus}
            onUpdateProcedure={onUpdateProcedure}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default AppointmentsTabs;
