
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import ProjectFilters from './ProjectFilters';
import ProjectStatsDisplay from './ProjectStatsDisplay';

interface ProjectStats {
  adSpend: number;
  newLeads: number;
  costPerLead: number;
  bookedAppointments: number;
  confirmedAppointments: number;
  unconfirmedAppointments: number;
  appointmentsToTakePlace: number;
  shows: number;
  noShows: number;
  confirmedPercentage: number;
  outboundDials: number;
  pickups40Plus: number;
  conversations2Plus: number;
  bookingPercentage: number;
}

const ProjectsDashboard = () => {
  const [projects, setProjects] = useState<Array<{ id: string; project_name: string }>>([]);
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedProject, dateRange]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive"
      });
    }
  };

  const fetchAllRecords = async (baseQuery: any, tableName: string) => {
    let allRecords: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await baseQuery
        .range(from, from + batchSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allRecords = [...allRecords, ...data];
        from += batchSize;
        hasMore = data.length === batchSize;
        console.log(`Fetched ${tableName} batch: ${data.length} records, total so far: ${allRecords.length}`);
      } else {
        hasMore = false;
      }
    }

    console.log(`Total ${tableName} fetched: ${allRecords.length}`);
    return allRecords;
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Build base queries
      let leadsQuery = supabase.from('new_leads').select('*');
      let appointmentsQuery = supabase.from('all_appointments').select('*');
      let callsBaseQuery = supabase.from('all_calls').select('*');
      let adSpendQuery = supabase.from('facebook_ad_spend').select('spend');

      // Apply project filter if not ALL
      if (selectedProject !== 'ALL') {
        leadsQuery = leadsQuery.eq('project_name', selectedProject);
        appointmentsQuery = appointmentsQuery.eq('project_name', selectedProject);
        callsBaseQuery = callsBaseQuery.eq('project_name', selectedProject);
        adSpendQuery = adSpendQuery.eq('project_name', selectedProject);
      }

      // Apply date filters
      if (dateRange.from) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        leadsQuery = leadsQuery.gte('date', fromDate);
        appointmentsQuery = appointmentsQuery.gte('date_appointment_created', fromDate);
        callsBaseQuery = callsBaseQuery.gte('date', fromDate);
        adSpendQuery = adSpendQuery.gte('date', fromDate);
      }

      if (dateRange.to) {
        const toDate = dateRange.to.toISOString().split('T')[0];
        leadsQuery = leadsQuery.lte('date', toDate);
        appointmentsQuery = appointmentsQuery.lte('date_appointment_created', toDate);
        callsBaseQuery = callsBaseQuery.lte('date', toDate);
        adSpendQuery = adSpendQuery.lte('date', toDate);
      }

      // Execute queries - fetch all records with pagination for large datasets
      console.log('Starting to fetch all data with proper pagination...');
      
      const [leads, appointments, calls, adSpendData] = await Promise.all([
        fetchAllRecords(leadsQuery, 'leads'),
        fetchAllRecords(appointmentsQuery, 'appointments'),
        fetchAllRecords(callsBaseQuery, 'calls'),
        fetchAllRecords(adSpendQuery, 'ad_spend')
      ]);

      console.log(`Final counts - Leads: ${leads.length}, Appointments: ${appointments.length}, Calls: ${calls.length}, Ad Spend: ${adSpendData.length}`);

      // Calculate metrics
      const newLeads = leads.length;
      const bookedAppointments = appointments.length;
      const confirmedAppointments = appointments.filter(apt => apt.confirmed).length;
      const unconfirmedAppointments = bookedAppointments - confirmedAppointments;
      
      // For appointments to take place, we need to check the actual appointment date in the future
      const appointmentsToTakePlace = appointments.filter(apt => 
        apt.date_of_appointment && new Date(apt.date_of_appointment) >= new Date()
      ).length;

      // Fixed shows and no-shows calculation logic
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only count appointments that have occurred (past appointment date)
      const pastAppointments = appointments.filter(apt => {
        if (!apt.date_of_appointment) return false;
        const appointmentDate = new Date(apt.date_of_appointment);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate < today;
      });

      // Shows: appointments that actually showed up (status = 'Showed' OR showed = true)
      const shows = pastAppointments.filter(apt => 
        apt.status === 'Showed' || apt.showed === true
      ).length;

      // No Shows: past appointments that didn't show and weren't cancelled
      const noShows = pastAppointments.filter(apt => 
        (apt.status === 'No Show' || (apt.showed === false && apt.status !== 'Cancelled')) &&
        apt.status !== 'Showed' && apt.showed !== true
      ).length;
      
      const outboundDials = calls.filter(call => call.direction === 'outbound').length;
      const pickups40Plus = calls.filter(call => 
        call.status === 'completed' && call.duration_seconds >= 40
      ).length;
      const conversations2Plus = calls.filter(call => call.duration_seconds >= 120).length;

      const adSpend = adSpendData.reduce((sum, record) => {
        const spendValue = typeof record.spend === 'string' ? parseFloat(record.spend) : Number(record.spend);
        return sum + (isNaN(spendValue) ? 0 : spendValue);
      }, 0);

      const costPerLead = newLeads > 0 && adSpend > 0 ? adSpend / newLeads : 0;
      const bookingPercentage = newLeads > 0 ? (bookedAppointments / newLeads) * 100 : 0;
      const confirmedPercentage = bookedAppointments > 0 ? (confirmedAppointments / bookedAppointments) * 100 : 0;

      setStats({
        adSpend,
        newLeads,
        costPerLead,
        bookedAppointments,
        confirmedAppointments,
        unconfirmedAppointments,
        appointmentsToTakePlace,
        shows,
        noShows,
        confirmedPercentage,
        outboundDials,
        pickups40Plus,
        conversations2Plus,
        bookingPercentage
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch project statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setQuickDateRange = (type: string) => {
    const now = new Date();
    switch (type) {
      case 'wtd':
        setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: now });
        break;
      case 'mtd':
        setDateRange({ from: startOfMonth(now), to: now });
        break;
      case 'ytd':
        setDateRange({ from: startOfYear(now), to: now });
        break;
      case 'last7':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      default:
        setDateRange({ from: undefined, to: undefined });
    }
  };

  return (
    <div className="space-y-6">
      <ProjectFilters
        projects={projects}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onQuickDateRange={setQuickDateRange}
      />

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p>Loading statistics...</p>
        </div>
      ) : stats ? (
        <ProjectStatsDisplay stats={stats} />
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No data available</p>
        </div>
      )}
    </div>
  );
};

export default ProjectsDashboard;
