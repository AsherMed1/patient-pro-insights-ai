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
import { statusOptions } from './appointments/utils';


interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const AllAppointmentsManager = ({
  projectFilter,
  onDataChanged,
  initialStatusFilter,
  initialProcedureFilter,
  initialTab
}: AllAppointmentsManagerProps) => {
  // Check if it's a new day and clear filters if needed
  const checkAndClearDailyFilters = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const lastClearDate = localStorage.getItem('lastFilterClearDate');
    
    if (lastClearDate !== today) {
      // Clear all filter data
      localStorage.removeItem('appointmentFilters');
      localStorage.setItem('lastFilterClearDate', today);
      return true; // Filters were cleared
    }
    return false; // Filters weren't cleared
  };

  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || "new");
  const [showImport, setShowImport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    new: 0,
    needsReview: 0,
    future: 0,
    past: 0
  });
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'phone' | 'dob'>('name');
  const [localProjectFilter, setLocalProjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'ALL');
  const [procedureOrderFilter, setProcedureOrderFilter] = useState(initialProcedureFilter || 'ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'procedure_ordered' | 'project' | 'name_asc' | 'name_desc'>('date_desc');
  const { toast } = useToast();
  
  const APPOINTMENTS_PER_PAGE = 50;

  // Clear filters on mount if it's a new day
  useEffect(() => {
    const wasCleared = checkAndClearDailyFilters();
    if (wasCleared) {
      console.log('Filters cleared for new day');
    }
  }, []);

  // Update filters when initial props change (from stats card clicks)
  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
    if (initialProcedureFilter) {
      setProcedureOrderFilter(initialProcedureFilter);
    }
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialStatusFilter, initialProcedureFilter, initialTab]);

  useEffect(() => {
    setCurrentPage(1);
    fetchAppointments();
    fetchTabCounts();
  }, [projectFilter, dateRange, activeTab, searchTerm, searchType, localProjectFilter, statusFilter, procedureOrderFilter, locationFilter, serviceFilter, sortBy]);

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
      
      // For project-specific views, filter by project name
      if (activeProjectFilter) {
        const normalizedProject = activeProjectFilter.trim();
        if (normalizedProject !== activeProjectFilter) {
          countQuery = countQuery.or(`project_name.eq.${activeProjectFilter},project_name.eq.${normalizedProject}`);
        } else {
          countQuery = countQuery.eq('project_name', activeProjectFilter);
        }
      }

      // For main analytics view (no project filter), don't apply the was_ever_confirmed filter
      if (!activeProjectFilter) {
        // No additional filtering needed for main analytics
      }
      
      // Apply date range filter (filter by actual appointment date, not creation date)
      if (dateRange.from) {
        countQuery = countQuery.gte('date_of_appointment', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        countQuery = countQuery.lte('date_of_appointment', format(dateRange.to, 'yyyy-MM-dd'));
      }
      
      // Apply search filter based on search type
      if (searchTerm.trim()) {
        if (searchType === 'name') {
          countQuery = countQuery.ilike('lead_name', `%${searchTerm.trim()}%`);
        } else if (searchType === 'phone') {
          countQuery = countQuery.ilike('lead_phone_number', `%${searchTerm.trim()}%`);
         } else if (searchType === 'dob') {
           countQuery = countQuery.ilike('dob::text', `%${searchTerm.trim()}%`);
         }
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

      // Apply location filter (extracted from calendar_name)
      if (locationFilter !== 'ALL') {
        countQuery = countQuery.ilike('calendar_name', `%at ${locationFilter}%`);
      }

      // Apply service filter (extracted from calendar_name) - more flexible matching
      if (serviceFilter !== 'ALL') {
        countQuery = countQuery.or(`calendar_name.ilike.%your ${serviceFilter} Consultation%,calendar_name.ilike.%your "${serviceFilter}" Consultation%,calendar_name.ilike.%your '${serviceFilter}' Consultation%`);
      }
      
      // Apply tab-based filtering to count query
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = format(today, 'yyyy-MM-dd');
      
      if (activeTab === 'all') {
        // All: No additional status filtering
      } else if (activeTab === 'new') {
        // New: Appointments where internal_process_complete is NOT true (false or null)
        countQuery = countQuery.or('internal_process_complete.is.null,internal_process_complete.eq.false');
      } else if (activeTab === 'needs-review') {
        // Needs Review: Past appointments (appointment date has passed) that don't have completed status
        countQuery = countQuery
          .not('date_of_appointment', 'is', null)
          .lt('date_of_appointment', todayString)
          .not('status', 'ilike', 'cancelled')
          .not('status', 'ilike', 'no show')
          .not('status', 'ilike', 'noshow')
          .not('status', 'ilike', 'showed')
          .not('status', 'ilike', 'won')
          .not('status', 'ilike', 'oon');
      } else if (activeTab === 'future') {
        // Upcoming: Future appointments with internal_process_complete = true (two-point trigger)
        countQuery = countQuery
          .eq('internal_process_complete', true)
          .not('date_of_appointment', 'is', null)
          .gte('date_of_appointment', todayString)
          .not('status', 'ilike', 'cancelled')
          .not('status', 'ilike', 'no show')
          .not('status', 'ilike', 'noshow')
          .not('status', 'ilike', 'showed')
          .not('status', 'ilike', 'won')
          .not('status', 'ilike', 'oon');
      } else if (activeTab === 'past') {
        // Completed: appointments with final status (case-insensitive)
        countQuery = countQuery
          .or('status.ilike.cancelled,status.ilike.no show,status.ilike.noshow,status.ilike.showed,status.ilike.won,status.ilike.oon');
      }

      // Get the total count first
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Now build the data query with the same filters
      let appointmentsQuery = supabase
        .from('all_appointments')
        .select('*');

      // Sort by newest first on the "New" tab
      if (activeTab === 'new') {
        appointmentsQuery = appointmentsQuery.order('date_appointment_created', { ascending: false });
      } else {
        // Apply user-selected sorting for ALL views (including project-specific)
        if (sortBy === 'name_asc' || sortBy === 'name_desc') {
          appointmentsQuery = appointmentsQuery.order('lead_name', { ascending: sortBy === 'name_asc', nullsFirst: false });
        } else if (sortBy === 'date_asc' || sortBy === 'date_desc') {
          appointmentsQuery = appointmentsQuery.order('date_appointment_created', { ascending: sortBy === 'date_asc', nullsFirst: false });
        } else {
          appointmentsQuery = appointmentsQuery.order(
            sortBy === 'procedure_ordered' ? 'procedure_ordered' : 
            sortBy === 'project' ? 'project_name' : 'date_appointment_created', 
            { ascending: sortBy === 'project' ? true : false, nullsFirst: sortBy === 'procedure_ordered' ? false : true }
          );
        }
      }

      // Apply the same filters to the data query
      if (activeProjectFilter) {
        const normalizedProject = activeProjectFilter.trim();
        if (normalizedProject !== activeProjectFilter) {
          appointmentsQuery = appointmentsQuery.or(`project_name.eq.${activeProjectFilter},project_name.eq.${normalizedProject}`);
        } else {
          appointmentsQuery = appointmentsQuery.eq('project_name', activeProjectFilter);
        }
      }
      
      if (dateRange.from) {
        appointmentsQuery = appointmentsQuery.gte('date_of_appointment', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        appointmentsQuery = appointmentsQuery.lte('date_of_appointment', format(dateRange.to, 'yyyy-MM-dd'));
      }
      
      // Apply search filter based on search type
      if (searchTerm.trim()) {
        if (searchType === 'name') {
          appointmentsQuery = appointmentsQuery.ilike('lead_name', `%${searchTerm.trim()}%`);
        } else if (searchType === 'phone') {
          appointmentsQuery = appointmentsQuery.ilike('lead_phone_number', `%${searchTerm.trim()}%`);
         } else if (searchType === 'dob') {
           appointmentsQuery = appointmentsQuery.ilike('dob::text', `%${searchTerm.trim()}%`);
         }
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

      // Apply location filter (extracted from calendar_name)
      if (locationFilter !== 'ALL') {
        appointmentsQuery = appointmentsQuery.ilike('calendar_name', `%at ${locationFilter}%`);
      }

      // Apply service filter (extracted from calendar_name)
      if (serviceFilter !== 'ALL') {
        appointmentsQuery = appointmentsQuery.ilike('calendar_name', `%your ${serviceFilter} Consultation%`);
      }
      
      
      if (activeTab === 'all') {
        // All: No additional status filtering
      } else if (activeTab === 'new') {
        // New: Appointments where internal_process_complete is NOT true (false or null)
        appointmentsQuery = appointmentsQuery.or('internal_process_complete.is.null,internal_process_complete.eq.false');
      } else if (activeTab === 'needs-review') {
        // Needs Review: Past appointments (appointment date has passed) that don't have completed status
        appointmentsQuery = appointmentsQuery
          .not('date_of_appointment', 'is', null)
          .lt('date_of_appointment', todayString)
          .not('status', 'ilike', 'cancelled')
          .not('status', 'ilike', 'no show')
          .not('status', 'ilike', 'noshow')
          .not('status', 'ilike', 'showed')
          .not('status', 'ilike', 'won')
          .not('status', 'ilike', 'oon');
      } else if (activeTab === 'future') {
        // Upcoming: Future appointments with internal_process_complete = true (two-point trigger)
        appointmentsQuery = appointmentsQuery
          .eq('internal_process_complete', true)
          .not('date_of_appointment', 'is', null)
          .gte('date_of_appointment', todayString)
          .not('status', 'ilike', 'cancelled')
          .not('status', 'ilike', 'no show')
          .not('status', 'ilike', 'noshow')
          .not('status', 'ilike', 'showed')
          .not('status', 'ilike', 'won')
          .not('status', 'ilike', 'oon');
      } else if (activeTab === 'past') {
        // Completed: appointments with final status (case-insensitive)
        appointmentsQuery = appointmentsQuery
          .or('status.ilike.cancelled,status.ilike.no show,status.ilike.noshow,status.ilike.showed,status.ilike.won,status.ilike.oon');
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
          const normalizedProject = activeProjectFilter.trim();
          if (normalizedProject !== activeProjectFilter) {
            query = query.or(`project_name.eq.${activeProjectFilter},project_name.eq.${normalizedProject}`);
          } else {
            query = query.eq('project_name', activeProjectFilter);
          }
        }
        
        if (dateRange.from) {
          query = query.gte('date_of_appointment', format(dateRange.from, 'yyyy-MM-dd'));
        }
        if (dateRange.to) {
          query = query.lte('date_of_appointment', format(dateRange.to, 'yyyy-MM-dd'));
        }
        
        // Apply search filter based on search type
        if (searchTerm.trim()) {
          if (searchType === 'name') {
            query = query.ilike('lead_name', `%${searchTerm.trim()}%`);
          } else if (searchType === 'phone') {
            query = query.ilike('lead_phone_number', `%${searchTerm.trim()}%`);
           } else if (searchType === 'dob') {
             query = query.ilike('dob::text', `%${searchTerm.trim()}%`);
           }
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

        // Apply location filter (extracted from calendar_name)
        if (locationFilter !== 'ALL') {
          query = query.ilike('calendar_name', `%at ${locationFilter}%`);
        }

      // Apply service filter (extracted from calendar_name) - more flexible matching
      if (serviceFilter !== 'ALL') {
        query = query.or(`calendar_name.ilike.%your ${serviceFilter} Consultation%,calendar_name.ilike.%your "${serviceFilter}" Consultation%,calendar_name.ilike.%your '${serviceFilter}' Consultation%`);
      }
        
        
        return query;
      };

      // Fetch counts for each tab
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = format(today, 'yyyy-MM-dd');

      // All: No additional filtering
      const allQuery = getBaseQuery();

      // New: Appointments with 'new' status or null/empty status
      const newQuery = getBaseQuery()
        .or('status.is.null,status.eq.,status.ilike.new,status.ilike.confirmed');
      
      // Needs Review: Past appointments (appointment date has passed) that don't have completed status
      const needsReviewQuery = getBaseQuery()
        .not('date_of_appointment', 'is', null)
        .lt('date_of_appointment', todayString)
        .not('status', 'ilike', 'cancelled')
        .not('status', 'ilike', 'no show')
        .not('status', 'ilike', 'noshow')
        .not('status', 'ilike', 'showed')
        .not('status', 'ilike', 'won')
        .not('status', 'ilike', 'oon');
      
      // Upcoming: Future appointments (appointment date is today or later)
        const futureQuery = getBaseQuery()
          .not('date_of_appointment', 'is', null)
          .gte('date_of_appointment', todayString)
          .not('status', 'ilike', 'confirmed')
          .not('status', 'ilike', 'cancelled')
          .not('status', 'ilike', 'no show')
          .not('status', 'ilike', 'noshow')
          .not('status', 'ilike', 'showed')
          .not('status', 'ilike', 'won')
          .not('status', 'ilike', 'oon');
      
      // Completed: appointments with final status (case-insensitive)
      const pastQuery = getBaseQuery()
        .or('status.ilike.cancelled,status.ilike.no show,status.ilike.noshow,status.ilike.showed,status.ilike.won,status.ilike.oon');

      const [allResult, newResult, needsReviewResult, futureResult, pastResult] = await Promise.all([
        allQuery,
        newQuery,
        needsReviewQuery,
        futureQuery,
        pastQuery
      ]);

      setTabCounts({
        all: allResult.count || 0,
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
    fetchTabCounts();
    onDataChanged?.();
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    console.log('🔄 updateAppointmentStatus called with:', { appointmentId, status });
    try {
      // Get the current appointment to track status change
      const currentAppointment = appointments.find(a => a.id === appointmentId);
      const oldStatus = currentAppointment?.status || 'None';
      
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
      
      console.log('📡 Making API call with updateData:', updateData);
      const { error } = await supabase
        .from('all_appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) {
        console.error('❌ API error:', error);
        throw error;
      }

      console.log('✅ API call successful');

      // Add system note to track status change
      if (oldStatus !== status) {
        const timestamp = new Date().toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        const systemNote = `Status changed from "${oldStatus}" to "${status}" - ${timestamp}`;
        
        await supabase
          .from('appointment_notes')
          .insert({
            appointment_id: appointmentId,
            note_text: systemNote,
            created_by: 'System'
          });
        
        // Trigger webhook for status change
        try {
          await supabase.functions.invoke('appointment-status-webhook', {
            body: {
              appointment_id: appointmentId,
              old_status: oldStatus,
              new_status: status
            }
          });
          console.log('✅ Webhook triggered successfully');
        } catch (webhookError) {
          console.error('⚠️ Webhook failed (non-critical):', webhookError);
          // Don't throw - webhook failure shouldn't block the status update
        }
      }

      // Update local state
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
      
      // Update tab counts only (local state already updated optimistically)
      fetchTabCounts();
      onDataChanged?.();
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

      // Update local state
      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, procedure_ordered: procedureOrdered }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Procedure information updated successfully"
      });
      
      // Only refresh tab counts
      fetchTabCounts();
      onDataChanged?.();
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
      onDataChanged?.();
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
      onDataChanged?.();
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
      onDataChanged?.();
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
      onDataChanged?.();
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
      onDataChanged?.();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error",
        description: "Failed to delete appointment",
        variant: "destructive"
      });
    }
  };

  const updateAppointmentName = async (appointmentId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          lead_name: name,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, lead_name: name }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Patient name updated"
      });
      
      onDataChanged?.();
    } catch (error) {
      console.error('Error updating patient name:', error);
      toast({
        title: "Error",
        description: "Failed to update patient name",
        variant: "destructive"
      });
    }
  };

  const updateAppointmentEmail = async (appointmentId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          lead_email: email,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, lead_email: email }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Email updated"
      });
      
      onDataChanged?.();
    } catch (error) {
      console.error('Error updating email:', error);
      toast({
        title: "Error",
        description: "Failed to update email",
        variant: "destructive"
      });
    }
  };

  const updateAppointmentPhone = async (appointmentId: string, phone: string) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          lead_phone_number: phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, lead_phone_number: phone }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Phone number updated"
      });
      
      onDataChanged?.();
    } catch (error) {
      console.error('Error updating phone:', error);
      toast({
        title: "Error",
        description: "Failed to update phone number",
        variant: "destructive"
      });
    }
  };

  const updateCalendarLocation = async (appointmentId: string, location: string) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          calendar_name: location,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, calendar_name: location }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Location updated"
      });
      
      onDataChanged?.();
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Error",
        description: "Failed to update location",
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
        searchType={searchType}
        onSearchTypeChange={setSearchType}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClearFilters={() => {
          setDateRange({ from: undefined, to: undefined });
          setSearchTerm('');
          setSearchType('name');
          setLocalProjectFilter('ALL');
          setStatusFilter('ALL');
          setProcedureOrderFilter('ALL');
          setLocationFilter('ALL');
          setServiceFilter('ALL');
          setSortBy('date_desc');
        }}
        projectFilter={localProjectFilter !== 'ALL' ? localProjectFilter : (projectFilter || 'ALL')}
        onProjectFilterChange={setLocalProjectFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        procedureOrderFilter={procedureOrderFilter}
        onProcedureOrderFilterChange={setProcedureOrderFilter}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        serviceFilter={serviceFilter}
        onServiceFilterChange={setServiceFilter}
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
          <AppointmentsCsvImport defaultProject={projectFilter} />
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
            statusOptions={statusOptions.sort()}
            onUpdateStatus={updateAppointmentStatus}
            onUpdateProcedure={updateProcedureOrdered}
            onUpdateDate={updateAppointmentDate}
            onUpdateTime={updateRequestedTime}
            onUpdateInternalProcess={updateInternalProcessComplete}
            onUpdateDOB={updateDOB}
            onDelete={deleteAppointment}
            onUpdateName={updateAppointmentName}
            onUpdateEmail={updateAppointmentEmail}
            onUpdatePhone={updateAppointmentPhone}
            onUpdateCalendarLocation={updateCalendarLocation}
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
