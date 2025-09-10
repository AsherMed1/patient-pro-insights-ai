import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { AllAppointment, AllAppointmentsManagerProps } from './appointments/types';
import AppointmentsTabs from './appointments/AppointmentsTabs';
import AppointmentsCsvImport from './AppointmentsCsvImport';
import PaginationControls from './shared/PaginationControls';
import { AppointmentFilters } from './appointments/AppointmentFilters';
import { format } from 'date-fns';


interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const AllAppointmentsManager = ({
  projectFilter
}: AllAppointmentsManagerProps) => {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("new");
  const [showImport, setShowImport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tabCounts, setTabCounts] = useState({
    new: 0,
    needsReview: 0,
    future: 0,
    past: 0
  });
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [searchTerm, setSearchTerm] = useState('');
  const [localProjectFilter, setLocalProjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [procedureOrderFilter, setProcedureOrderFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'procedure_ordered' | 'project'>('date');
  const { toast } = useToast();
  
  const APPOINTMENTS_PER_PAGE = 50;

  useEffect(() => {
    setCurrentPage(1);
    fetchAppointments();
    fetchTabCounts();
  }, [projectFilter, dateRange, activeTab, searchTerm, localProjectFilter, statusFilter, procedureOrderFilter, sortBy]);

  useEffect(() => {
    fetchAppointments();
  }, [currentPage]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      // Build the base query for counting
      let countQuery = supabase
        .from('all_appointments')
        .select('*', { count: 'exact', head: true });

      // Apply project filter first
      const activeProjectFilter = localProjectFilter !== 'ALL' ? localProjectFilter : projectFilter;
      
      // For project-specific views, only show appointments that were ever confirmed OR are currently confirmed OR have welcome call status
      if (activeProjectFilter) {
        countQuery = countQuery
          .eq('project_name', activeProjectFilter)
          .or('was_ever_confirmed.eq.true,status.ilike.confirmed,status.ilike.welcome call');
      }

      // For main analytics view (no project filter), don't apply the was_ever_confirmed filter
      if (!activeProjectFilter) {
        // No additional filtering needed for main analytics
      }
      
      // Apply date range filter
      if (dateRange.from) {
        countQuery = countQuery.gte('date_appointment_created', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        countQuery = countQuery.lte('date_appointment_created', format(dateRange.to, 'yyyy-MM-dd'));
      }
      
      // Apply search filter
      if (searchTerm.trim()) {
        countQuery = countQuery.ilike('lead_name', `%${searchTerm.trim()}%`);
      }
      
      // Apply status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'New') {
          // For "New" status, include both actual "New" status AND null status (which shows as "New" in UI)
          countQuery = countQuery.or(`status.ilike.${statusFilter},status.is.null`);
        } else {
          countQuery = countQuery.ilike('status', statusFilter);
        }
      }
      
      // Apply procedure order filter
      if (procedureOrderFilter !== 'ALL') {
        if (procedureOrderFilter === 'true') {
          countQuery = countQuery.eq('procedure_ordered', true);
        } else if (procedureOrderFilter === 'false') {
          countQuery = countQuery.eq('procedure_ordered', false);
        } else if (procedureOrderFilter === 'null') {
          countQuery = countQuery.is('procedure_ordered', null);
        }
      }
      
      // Apply tab-based filtering to count query
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = format(today, 'yyyy-MM-dd');
      
      if (activeTab === 'new') {
        // New: All new appointments (status is null, empty, or "new")
        countQuery = countQuery.or('status.is.null,status.eq.,status.ilike.new');
      } else if (activeTab === 'needs-review') {
        // Needs Review: All appointments that aren't in future or completed status
        countQuery = countQuery
          .not('status', 'ilike', 'cancelled')
          .not('status', 'ilike', 'no show')
          .not('status', 'ilike', 'noshow')
          .not('status', 'ilike', 'showed')
          .not('status', 'ilike', 'won')
          .or(`date_of_appointment.lte.${todayString},date_of_appointment.is.null,not.and(status.ilike.confirmed,date_of_appointment.gt.${todayString}),not.and(status.ilike.welcome call,date_of_appointment.gt.${todayString}),not.and(status.ilike.rescheduled,date_of_appointment.gt.${todayString})`);
        } else if (activeTab === 'future') {
        // Upcoming: confirmed, welcome call, or rescheduled appointments in the future (case-insensitive)
        countQuery = countQuery
          .or('status.ilike.confirmed,status.ilike.welcome call,status.ilike.rescheduled')
          .gt('date_of_appointment', todayString);
        } else if (activeTab === 'past') {
        // Completed: appointments with final status (case-insensitive)
        countQuery = countQuery
          .or('status.ilike.cancelled,status.ilike.no show,status.ilike.noshow,status.ilike.showed,status.ilike.won');
        }

      // Get the total count first
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Now build the data query with the same filters
      let appointmentsQuery = supabase
        .from('all_appointments')
        .select('*');

      // For project-specific views, sort by appointment date (soonest first), then by created date
      // For main analytics, keep original sorting by created date
      if (activeProjectFilter) {
        appointmentsQuery = appointmentsQuery.order('date_of_appointment', { ascending: true, nullsFirst: false })
                                           .order('date_appointment_created', { ascending: false });
      } else {
        appointmentsQuery = appointmentsQuery.order(
          sortBy === 'procedure_ordered' ? 'procedure_ordered' : 
          sortBy === 'project' ? 'project_name' : 'date_appointment_created', 
          { ascending: sortBy === 'project' ? true : false, nullsFirst: sortBy === 'procedure_ordered' ? false : true }
        );
      }

      // Apply the same filters to the data query
      if (activeProjectFilter) {
        appointmentsQuery = appointmentsQuery
          .eq('project_name', activeProjectFilter)
          .or('was_ever_confirmed.eq.true,status.ilike.confirmed,status.ilike.welcome call');
      }
      
      if (dateRange.from) {
        appointmentsQuery = appointmentsQuery.gte('date_appointment_created', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        appointmentsQuery = appointmentsQuery.lte('date_appointment_created', format(dateRange.to, 'yyyy-MM-dd'));
      }
      
      // Apply search filter
      if (searchTerm.trim()) {
        appointmentsQuery = appointmentsQuery.ilike('lead_name', `%${searchTerm.trim()}%`);
      }
      
      // Apply status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'New') {
          // For "New" status, include both actual "New" status AND null status (which shows as "New" in UI)
          appointmentsQuery = appointmentsQuery.or(`status.ilike.${statusFilter},status.is.null`);
        } else {
          appointmentsQuery = appointmentsQuery.ilike('status', statusFilter);
        }
      }
      
      // Apply procedure order filter
      if (procedureOrderFilter !== 'ALL') {
        if (procedureOrderFilter === 'true') {
          appointmentsQuery = appointmentsQuery.eq('procedure_ordered', true);
        } else if (procedureOrderFilter === 'false') {
          appointmentsQuery = appointmentsQuery.eq('procedure_ordered', false);
        } else if (procedureOrderFilter === 'null') {
          appointmentsQuery = appointmentsQuery.is('procedure_ordered', null);
        }
      }
      
      
      if (activeTab === 'new') {
        // New: All new appointments (status is null, empty, or "new")
        appointmentsQuery = appointmentsQuery.or('status.is.null,status.eq.,status.ilike.new');
      } else if (activeTab === 'needs-review') {
        // Needs Review: All appointments that aren't in future or completed status
        appointmentsQuery = appointmentsQuery
          .not('status', 'ilike', 'cancelled')
          .not('status', 'ilike', 'no show')
          .not('status', 'ilike', 'noshow')
          .not('status', 'ilike', 'showed')
          .not('status', 'ilike', 'won')
          .or(`date_of_appointment.lte.${todayString},date_of_appointment.is.null,not.and(status.ilike.confirmed,date_of_appointment.gt.${todayString}),not.and(status.ilike.welcome call,date_of_appointment.gt.${todayString}),not.and(status.ilike.rescheduled,date_of_appointment.gt.${todayString})`);
      } else if (activeTab === 'future') {
        // Upcoming: confirmed, welcome call, or rescheduled appointments in the future (case-insensitive)
        appointmentsQuery = appointmentsQuery
          .or('status.ilike.confirmed,status.ilike.welcome call,status.ilike.rescheduled')
          .gt('date_of_appointment', todayString);
      } else if (activeTab === 'past') {
        // Completed: appointments with final status (case-insensitive)
        appointmentsQuery = appointmentsQuery
          .or('status.ilike.cancelled,status.ilike.no show,status.ilike.noshow,status.ilike.showed,status.ilike.won');
      }
      
      // Apply pagination
      const from = (currentPage - 1) * APPOINTMENTS_PER_PAGE;
      const to = from + APPOINTMENTS_PER_PAGE - 1;
      appointmentsQuery = appointmentsQuery.range(from, to);

      const { data, error } = await appointmentsQuery;
      if (error) throw error;
      console.log(`Fetched ${data?.length || 0} appointments from database`);
      console.log('Active tab:', activeTab);
      console.log('Project filter:', activeProjectFilter);
      console.log('Welcome Call appointments found:', data?.filter(a => a.status?.toLowerCase() === 'welcome call').length || 0);
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTabCounts = async () => {
    try {
      // Base query filters (project and date range)
      const getBaseQuery = () => {
        let query = supabase.from('all_appointments').select('*', { count: 'exact', head: true });
        
        const activeProjectFilter = localProjectFilter !== 'ALL' ? localProjectFilter : projectFilter;
        if (activeProjectFilter) {
          query = query.eq('project_name', activeProjectFilter)
                      .or('was_ever_confirmed.eq.true,status.ilike.confirmed,status.ilike.welcome call');
        }
        
        if (dateRange.from) {
          query = query.gte('date_appointment_created', format(dateRange.from, 'yyyy-MM-dd'));
        }
        if (dateRange.to) {
          query = query.lte('date_appointment_created', format(dateRange.to, 'yyyy-MM-dd'));
        }
        
        // Apply search filter
        if (searchTerm.trim()) {
          query = query.ilike('lead_name', `%${searchTerm.trim()}%`);
        }
        
        // Apply status filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'New') {
            // For "New" status, include both actual "New" status AND null status (which shows as "New" in UI)
            query = query.or(`status.ilike.${statusFilter},status.is.null`);
          } else {
            query = query.ilike('status', statusFilter);
          }
        }
        
        // Apply procedure order filter
        if (procedureOrderFilter !== 'ALL') {
          if (procedureOrderFilter === 'true') {
            query = query.eq('procedure_ordered', true);
          } else if (procedureOrderFilter === 'false') {
            query = query.eq('procedure_ordered', false);
          } else if (procedureOrderFilter === 'null') {
            query = query.is('procedure_ordered', null);
          }
        }
        
        
        return query;
      };

      // Fetch counts for each tab
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = format(today, 'yyyy-MM-dd');

      // New: All new appointments (status is null, empty, or "new")
      const newQuery = getBaseQuery()
        .or('status.is.null,status.eq.,status.ilike.new');

      // Needs Review: All appointments that aren't in future or completed status
      const needsReviewQuery = getBaseQuery()
        .not('status', 'ilike', 'cancelled')
        .not('status', 'ilike', 'no show')
        .not('status', 'ilike', 'noshow')
        .not('status', 'ilike', 'showed')
        .not('status', 'ilike', 'won')
        .or(`date_of_appointment.lte.${todayString},date_of_appointment.is.null,not.and(status.ilike.confirmed,date_of_appointment.gt.${todayString}),not.and(status.ilike.welcome call,date_of_appointment.gt.${todayString}),not.and(status.ilike.rescheduled,date_of_appointment.gt.${todayString})`);
      
      // Upcoming: confirmed, welcome call, or rescheduled appointments in the future (case-insensitive)
      const futureQuery = getBaseQuery()
        .or('status.ilike.confirmed,status.ilike.welcome call,status.ilike.rescheduled')
        .gt('date_of_appointment', todayString);
      
      // Completed: appointments with final status (case-insensitive)
      const pastQuery = getBaseQuery()
        .or('status.ilike.cancelled,status.ilike.no show,status.ilike.noshow,status.ilike.showed,status.ilike.won');

      const [newResult, needsReviewResult, futureResult, pastResult] = await Promise.all([
        newQuery,
        needsReviewQuery,
        futureQuery,
        pastQuery
      ]);

      setTabCounts({
        new: newResult.count || 0,
        needsReview: needsReviewResult.count || 0,
        future: futureResult.count || 0,
        past: pastResult.count || 0
      });
    } catch (error) {
      console.error('Error fetching tab counts:', error);
    }
  };

  const handleImportComplete = () => {
    setShowImport(false);
    fetchAppointments(); // Refresh the appointments list
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      // Set status and updated timestamp
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };
      
      // Only automatically set procedure_ordered for specific statuses
      if (status === 'Won') {
        updateData.procedure_ordered = true;
      } else if (status === 'Cancelled' || status === 'No Show' || status.toLowerCase() === 'noshow') {
        updateData.procedure_ordered = false;
      }
      // Note: "Showed" status does NOT automatically set procedure_ordered - it should be set independently
      
      const { error } = await supabase
        .from('all_appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? {
              ...appointment,
              status,
              // Only update procedure_ordered for specific statuses, leave unchanged for "Showed"
              procedure_ordered: status === 'Won' ? true : (status === 'Cancelled' || status === 'No Show' || status.toLowerCase() === 'noshow') ? false : appointment.procedure_ordered
            }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Appointment status updated successfully"
      });
      
      // Refresh tab counts and appointments since filtering logic changed
      fetchTabCounts();
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    }
  };

  const updateProcedureOrdered = async (appointmentId: string, procedureOrdered: boolean) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          procedure_ordered: procedureOrdered,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, procedure_ordered: procedureOrdered }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Procedure information updated successfully"
      });
      
      fetchTabCounts();
      fetchAppointments();
    } catch (error) {
      console.error('Error updating procedure information:', error);
      toast({
        title: "Error",
        description: "Failed to update procedure information",
        variant: "destructive"
      });
    }
  };

  const updateAppointmentDate = async (appointmentId: string, date: string | null) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          date_of_appointment: date,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, date_of_appointment: date }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Appointment date updated"
      });

      fetchTabCounts();
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment date:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment date",
        variant: "destructive"
      });
    }
  };

  const updateInternalProcessComplete = async (appointmentId: string, isComplete: boolean) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          internal_process_complete: isComplete,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, internal_process_complete: isComplete }
          : appointment
      ));

      toast({
        title: "Success",
        description: `Internal process marked as ${isComplete ? 'complete' : 'incomplete'}`,
      });
    } catch (error) {
      console.error('Error updating internal process status:', error);
      toast({
        title: "Error",
        description: "Failed to update internal process status",
        variant: "destructive"
      });
    }
  };

  const updateRequestedTime = async (appointmentId: string, time: string | null) => {
    try {
      const normalizedTime = time && time.length === 5 ? `${time}:00` : time; // to HH:mm:ss
      const { error } = await supabase
        .from('all_appointments')
        .update({
          requested_time: normalizedTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, requested_time: normalizedTime }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Appointment time updated"
      });

      fetchTabCounts();
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment time:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment time",
        variant: "destructive"
      });
    }
  };

  const updateDOB = async (appointmentId: string, dob: string | null) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({ 
          dob: dob,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error updating DOB:', error);
        toast({
          title: "Error",
          description: "Failed to update date of birth",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setAppointments(prev => prev.map(appointment => 
        appointment.id === appointmentId 
          ? { ...appointment, dob: dob }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Date of birth updated successfully",
      });
    } catch (error) {
      console.error('Error updating DOB:', error);
      toast({
        title: "Error",
        description: "Failed to update date of birth",
        variant: "destructive"
      });
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      // Remove the appointment from local state
      setAppointments(prev => prev.filter(appointment => appointment.id !== appointmentId));

      toast({
        title: "Success",
        description: "Appointment deleted successfully"
      });
      
      // Refresh tab counts and appointments
      fetchTabCounts();
      fetchAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error",
        description: "Failed to delete appointment",
        variant: "destructive"
      });
    }
  };


  const totalPages = Math.ceil(totalCount / APPOINTMENTS_PER_PAGE);
  const startRecord = (currentPage - 1) * APPOINTMENTS_PER_PAGE + 1;
  const endRecord = Math.min(currentPage * APPOINTMENTS_PER_PAGE, totalCount);

  return (
    <div className="space-y-8">
      {/* Test Component - TEMPORARY */}
      
      
      {/* Enhanced Filter Component */}
      <AppointmentFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClearFilters={() => {
          setDateRange({ from: undefined, to: undefined });
          setSearchTerm('');
          setLocalProjectFilter('ALL');
          setStatusFilter('ALL');
          setProcedureOrderFilter('ALL');
          setSortBy('date');
        }}
        projectFilter={localProjectFilter}
        onProjectFilterChange={setLocalProjectFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        procedureOrderFilter={procedureOrderFilter}
        onProcedureOrderFilterChange={setProcedureOrderFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showImport={showImport}
        onShowImport={() => setShowImport(true)}
        isProjectSpecificView={!!projectFilter} // Pass true if we have a projectFilter prop
      />

      {/* CSV Import Component */}
      {showImport && (
        <div className="portal-section">
          <h3 className="text-lg font-semibold text-foreground mb-4">Import Historical Data</h3>
          <AppointmentsCsvImport />
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowImport(false)}>
              Cancel Import
            </Button>
            <Button onClick={handleImportComplete} className="bg-primary">
              Complete Import
            </Button>
          </div>
        </div>
      )}

      {/* Appointments List */}
      <Card className="w-full">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-lg md:text-xl">
            {projectFilter ? `${projectFilter} - All Appointments` : 'All Appointments'}
          </CardTitle>
          <CardDescription className="text-sm">
            Showing {totalCount > 0 ? startRecord : 0}-{endRecord} of {totalCount} appointment{totalCount !== 1 ? 's' : ''} (Times in Central Time Zone)
            {projectFilter && ` for ${projectFilter}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          {/* Top Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemsPerPage={APPOINTMENTS_PER_PAGE}
            onPageChange={setCurrentPage}
            className="mb-4 border-b pb-4"
          />

          <AppointmentsTabs
            appointments={appointments}
            loading={loading}
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            projectFilter={projectFilter}
            onUpdateStatus={updateAppointmentStatus}
            onUpdateProcedure={updateProcedureOrdered}
            onUpdateDate={updateAppointmentDate}
            onUpdateTime={updateRequestedTime}
            onUpdateInternalProcess={updateInternalProcessComplete}
            onUpdateDOB={updateDOB}
            onDelete={deleteAppointment}
            tabCounts={tabCounts}
          />
          
          {/* Bottom Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemsPerPage={APPOINTMENTS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AllAppointmentsManager;
