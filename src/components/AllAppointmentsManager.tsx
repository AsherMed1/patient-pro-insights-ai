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
  const [activeTab, setActiveTab] = useState("needs-review");
  const [showImport, setShowImport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tabCounts, setTabCounts] = useState({
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

      // Apply project filter (use local filter if available, otherwise fallback to prop)
      const activeProjectFilter = localProjectFilter !== 'ALL' ? localProjectFilter : projectFilter;
      if (activeProjectFilter) {
        countQuery = countQuery.eq('project_name', activeProjectFilter);
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
        countQuery = countQuery.eq('status', statusFilter);
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
      
      if (activeTab === 'needs-review') {
        // Needs Review: appointments that need status updates (null status) OR confirmed appointments for today/past
        countQuery = countQuery.or(`status.is.null,and(status.eq.confirmed,date_of_appointment.lte.${todayString})`);
      } else if (activeTab === 'future') {
        // Upcoming: confirmed appointments in the future
        countQuery = countQuery
          .eq('status', 'confirmed')
          .gt('date_of_appointment', todayString);
      } else if (activeTab === 'past') {
        // Completed: appointments with final status and procedure order set
        countQuery = countQuery
          .in('status', ['cancelled', 'no show', 'noshow', 'showed', 'won'])
          .not('procedure_ordered', 'is', null);
      }

      // Get the total count first
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Now build the data query with the same filters
      let appointmentsQuery = supabase
        .from('all_appointments')
        .select(`
          id,
          date_appointment_created,
          date_of_appointment,
          project_name,
          lead_name,
          lead_email,
          lead_phone_number,
          calendar_name,
          requested_time,
          stage_booked,
          showed,
          confirmed,
          agent,
          agent_number,
          ghl_id,
          confirmed_number,
          created_at,
          updated_at,
          status,
          procedure_ordered,
          patient_intake_notes,
          ai_summary,
          detected_insurance_provider,
          detected_insurance_plan,
          detected_insurance_id,
          insurance_detection_confidence
        `)
        .order(
          sortBy === 'procedure_ordered' ? 'procedure_ordered' : 
          sortBy === 'project' ? 'project_name' : 'date_appointment_created', 
          { ascending: sortBy === 'project' ? true : false, nullsFirst: sortBy === 'procedure_ordered' ? false : true }
        );

      // Apply the same filters to the data query
      if (activeProjectFilter) {
        appointmentsQuery = appointmentsQuery.eq('project_name', activeProjectFilter);
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
        appointmentsQuery = appointmentsQuery.eq('status', statusFilter);
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
      
      
      if (activeTab === 'needs-review') {
        // Needs Review: appointments that need status updates (null status) OR confirmed appointments for today/past
        appointmentsQuery = appointmentsQuery.or(`status.is.null,and(status.eq.confirmed,date_of_appointment.lte.${todayString})`);
      } else if (activeTab === 'future') {
        // Upcoming: confirmed appointments in the future
        appointmentsQuery = appointmentsQuery
          .eq('status', 'confirmed')
          .gt('date_of_appointment', todayString);
      } else if (activeTab === 'past') {
        // Completed: appointments with final status and procedure order set
        appointmentsQuery = appointmentsQuery
          .in('status', ['cancelled', 'no show', 'noshow', 'showed', 'won'])
          .not('procedure_ordered', 'is', null);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * APPOINTMENTS_PER_PAGE;
      const to = from + APPOINTMENTS_PER_PAGE - 1;
      appointmentsQuery = appointmentsQuery.range(from, to);

      const { data, error } = await appointmentsQuery;
      if (error) throw error;
      console.log(`Fetched ${data?.length || 0} appointments from database`);
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
          query = query.eq('project_name', activeProjectFilter);
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
          query = query.eq('status', statusFilter);
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

      // Needs Review: appointments that need status updates (null status) OR confirmed appointments for today/past
      const needsReviewQuery = getBaseQuery()
        .or(`status.is.null,and(status.eq.confirmed,date_of_appointment.lte.${todayString})`);

      // Upcoming: status = 'confirmed' AND date_of_appointment > today
      const futureQuery = getBaseQuery()
        .eq('status', 'confirmed')
        .gt('date_of_appointment', todayString);

      // Completed: status IN ('cancelled', 'no show', 'noshow', 'showed', 'won') AND procedure_ordered IS NOT NULL
      const pastQuery = getBaseQuery()
        .in('status', ['cancelled', 'no show', 'noshow', 'showed', 'won'])
        .not('procedure_ordered', 'is', null);

      const [needsReviewResult, futureResult, pastResult] = await Promise.all([
        needsReviewQuery,
        futureQuery,
        pastQuery
      ]);

      setTabCounts({
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
      // Set status and attendance fields, but leave procedure_ordered independent for "Showed" status
      const updateData: any = {
        status,
        showed: status === 'Showed' ? true : (status === 'No Show' || status.toLowerCase() === 'noshow') ? false : null,
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
              showed: status === 'Showed' ? true : (status === 'No Show' || status.toLowerCase() === 'noshow') ? false : null,
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
      
      // Refresh tab counts and appointments since filtering logic changed
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
        onShowImport={() => setShowImport(true)}
        showImport={showImport}
        sortBy={sortBy}
        onSortChange={setSortBy}
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
