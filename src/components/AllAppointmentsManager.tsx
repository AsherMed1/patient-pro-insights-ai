import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Upload, Calendar as CalendarIcon, Filter, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { AllAppointment, AllAppointmentsManagerProps } from './appointments/types';
import AppointmentsTabs from './appointments/AppointmentsTabs';
import AppointmentsCsvImport from './AppointmentsCsvImport';
import PaginationControls from './shared/PaginationControls';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();
  
  const APPOINTMENTS_PER_PAGE = 50;

  useEffect(() => {
    setCurrentPage(1);
    fetchAppointments();
    fetchTabCounts();
  }, [projectFilter, dateRange, activeTab, searchTerm]);

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

      // Apply project filter
      if (projectFilter) {
        countQuery = countQuery.eq('project_name', projectFilter);
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
      
      // Apply tab-based filtering to count query
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = format(today, 'yyyy-MM-dd');
      
      if (activeTab === 'needs-review') {
        countQuery = countQuery
          .lt('date_of_appointment', todayString)
          .not('status', 'in', '(Cancelled,No Show,Won,Lost)');
      } else if (activeTab === 'future') {
        countQuery = countQuery.gte('date_of_appointment', todayString);
      } else if (activeTab === 'past') {
        countQuery = countQuery
          .lt('date_of_appointment', todayString)
          .in('status', ['Cancelled', 'No Show', 'Won', 'Lost']);
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
          patient_intake_notes
        `)
        .order('date_appointment_created', { ascending: false });

      // Apply the same filters to the data query
      if (projectFilter) {
        appointmentsQuery = appointmentsQuery.eq('project_name', projectFilter);
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
      
      if (activeTab === 'needs-review') {
        appointmentsQuery = appointmentsQuery
          .lt('date_of_appointment', todayString)
          .not('status', 'in', '(Cancelled,No Show,Won,Lost)');
      } else if (activeTab === 'future') {
        appointmentsQuery = appointmentsQuery.gte('date_of_appointment', todayString);
      } else if (activeTab === 'past') {
        appointmentsQuery = appointmentsQuery
          .lt('date_of_appointment', todayString)
          .in('status', ['Cancelled', 'No Show', 'Won', 'Lost']);
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
        
        if (projectFilter) {
          query = query.eq('project_name', projectFilter);
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
        
        return query;
      };

      // Fetch counts for each tab
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = format(today, 'yyyy-MM-dd');

      // Needs Review: past appointments without completion status
      const needsReviewQuery = getBaseQuery()
        .lt('date_of_appointment', todayString)
        .not('status', 'in', '(Cancelled,No Show,Won,Lost)');

      // Future: date_of_appointment is today or future
      const futureQuery = getBaseQuery()
        .gte('date_of_appointment', todayString);

      // Past: past appointments with completion status
      const pastQuery = getBaseQuery()
        .lt('date_of_appointment', todayString)
        .in('status', ['Cancelled', 'No Show', 'Won', 'Lost']);

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
      const { error } = await supabase
        .from('all_appointments')
        .update({
          status,
          showed: status === 'Showed' ? true : status === 'No Show' ? false : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? {
              ...appointment,
              status,
              showed: status === 'Showed' ? true : status === 'No Show' ? false : null
            }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Appointment status updated successfully"
      });
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
    } catch (error) {
      console.error('Error updating procedure information:', error);
      toast({
        title: "Error",
        description: "Failed to update procedure information",
        variant: "destructive"
      });
    }
  };

  const getDateRangeText = () => {
    if (!dateRange.from && !dateRange.to) return 'All dates';
    if (dateRange.from && !dateRange.to) {
      return `From ${format(dateRange.from, "MMM dd, yyyy")}`;
    }
    if (!dateRange.from && dateRange.to) {
      return `Until ${format(dateRange.to, "MMM dd, yyyy")}`;
    }
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return format(dateRange.from, "MMM dd, yyyy");
      }
      return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
    }
    return 'Select date range';
  };

  const totalPages = Math.ceil(totalCount / APPOINTMENTS_PER_PAGE);
  const startRecord = (currentPage - 1) * APPOINTMENTS_PER_PAGE + 1;
  const endRecord = Math.min(currentPage * APPOINTMENTS_PER_PAGE, totalCount);

  return (
    <div className="space-y-6">
      {/* Import Section */}
      {!showImport && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Import Historical Appointments</CardTitle>
                <CardDescription>Upload past appointments data from CSV file</CardDescription>
              </div>
              <Button 
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* CSV Import Component */}
      {showImport && (
        <div className="space-y-4">
          <AppointmentsCsvImport />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportComplete}>
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Search and Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <Input
                  placeholder="Search appointments by patient name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by Date Range:</span>
              </div>
            
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "MMM dd") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                    initialFocus
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "MMM dd") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                    initialFocus
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>

              <Button 
                variant="outline" 
                onClick={() => {
                  setDateRange({ from: undefined, to: undefined });
                  setSearchTerm('');
                }}
                className="w-fit"
              >
                Clear Filters
              </Button>

              <div className="text-sm text-muted-foreground">
                Showing: {getDateRangeText()}
                {searchTerm && ` • Search: "${searchTerm}"`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
