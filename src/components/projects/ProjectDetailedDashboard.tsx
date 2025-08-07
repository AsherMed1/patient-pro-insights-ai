
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, TrendingUp, Phone, Users, Target, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  project_name: string;
  created_at: string;
  updated_at: string;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface ProjectDetailedDashboardProps {
  project: Project;
  children: React.ReactNode;
  dateRange?: DateRange;
}

interface DashboardStats {
  adSpend: number;
  newLeads: number;
  bookedAppointments: number;
  confirmedAppointments: number;
  showedAppointments: number;
  noShowAppointments: number;
  cancelledAppointments: number;
  newAppointments: number;
  rescheduledAppointments: number;
  wonAppointments: number;
  costPerLead: number;
  bookingPercentage: number;
  confirmedPercentage: number;
  outboundDials: number;
  pickups40Plus: number;
  conversations2Plus: number;
}

export const ProjectDetailedDashboard: React.FC<ProjectDetailedDashboardProps> = ({
  project,
  children,
  dateRange
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const fetchDetailedStats = async () => {
    try {
      setLoading(true);
      
      // Build queries with date filtering (no limits to show all data)
      let leadsQuery = supabase
        .from('new_leads')
        .select('*')
        .eq('project_name', project.project_name)
        .limit(50000);
      
      let appointmentsQuery = supabase
        .from('all_appointments')
        .select('*')
        .eq('project_name', project.project_name)
        .limit(50000);
      
      let callsQuery = supabase
        .from('all_calls')
        .select('*')
        .eq('project_name', project.project_name)
        .limit(50000);

      // Apply date filters if provided
      if (dateRange?.from) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        leadsQuery = leadsQuery.gte('date', fromDate);
        appointmentsQuery = appointmentsQuery.gte('date_appointment_created', fromDate);
        callsQuery = callsQuery.gte('date', fromDate);
      }
      
      if (dateRange?.to) {
        const toDate = dateRange.to.toISOString().split('T')[0];
        leadsQuery = leadsQuery.lte('date', toDate);
        appointmentsQuery = appointmentsQuery.lte('date_appointment_created', toDate);
        callsQuery = callsQuery.lte('date', toDate);
      }

      // Execute queries
      const [leadsResult, appointmentsResult, callsResult] = await Promise.all([
        leadsQuery,
        appointmentsQuery,
        callsQuery
      ]);
      
      if (leadsResult.error) throw leadsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;
      if (callsResult.error) throw callsResult.error;

      const leads = leadsResult.data;
      const appointments = appointmentsResult.data;
      const calls = callsResult.data;

      // Filter to only include appointments that would be visible in the portal tabs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const visibleAppointments = appointments?.filter(apt => {
        const status = apt.status?.toLowerCase();
        
        // Include appointments that appear in any of the three tabs:
        // 1. Needs Review: status = 'confirmed' AND date_of_appointment <= today
        // 2. Future: status = 'confirmed' AND date_of_appointment > today  
        // 3. Past: status IN ('cancelled', 'no show', 'noshow', 'showed', 'won') AND procedure_ordered IS NOT NULL
        
        if (status === 'confirmed') {
          return true; // Will appear in either Needs Review or Future tab
        }
        
        if (['cancelled', 'no show', 'noshow', 'showed', 'won'].includes(status) && apt.procedure_ordered !== null) {
          return true; // Will appear in Past tab
        }
        
        return false;
      }) || [];

      // Calculate stats based on visible appointments only
      const newLeads = leads?.length || 0;
      const bookedAppointments = visibleAppointments.length;
      
      // Categorize by specific status values (using visible appointments only)
      const confirmedAppointments = visibleAppointments.filter(apt => 
        apt.status?.toLowerCase() === 'confirmed'
      ).length;
      
      const showedAppointments = visibleAppointments.filter(apt => 
        apt.status?.toLowerCase() === 'showed'
      ).length;
      
      const noShowAppointments = visibleAppointments.filter(apt => 
        apt.status?.toLowerCase() === 'no show'
      ).length;
      
      const cancelledAppointments = visibleAppointments.filter(apt => 
        apt.status?.toLowerCase() === 'cancelled'
      ).length;
      
      const newAppointments = visibleAppointments.filter(apt => 
        apt.status === null || apt.status?.trim() === ''
      ).length;
      
      const rescheduledAppointments = visibleAppointments.filter(apt => 
        apt.status?.toLowerCase() === 'rescheduled'
      ).length;
      
      const wonAppointments = visibleAppointments.filter(apt => 
        apt.status?.toLowerCase() === 'won'
      ).length;
      const appointmentsToTakePlace = visibleAppointments.filter(apt => 
        new Date(apt.date_of_appointment) >= new Date()
      ).length;
      
      const outboundDials = calls?.filter(call => call.direction === 'outbound').length || 0;
      const pickups40Plus = calls?.filter(call => 
        (call.status === 'answered' || call.status === 'connected' || call.status === 'pickup') && 
        call.duration_seconds >= 40
      ).length || 0;
      const conversations2Plus = calls?.filter(call => 
        call.duration_seconds >= 120
      ).length || 0;

      // Calculate percentages
      const bookingPercentage = newLeads > 0 ? (bookedAppointments / newLeads) * 100 : 0;
      const confirmedPercentage = bookedAppointments > 0 ? (confirmedAppointments / bookedAppointments) * 100 : 0;
      
      // Mock ad spend and cost per lead (you may want to add these fields to your database)
      const adSpend = 0; // Add this data source when available
      const costPerLead = newLeads > 0 && adSpend > 0 ? adSpend / newLeads : 0;

      setStats({
        adSpend,
        newLeads,
        bookedAppointments,
        confirmedAppointments,
        showedAppointments,
        noShowAppointments,
        cancelledAppointments,
        newAppointments,
        rescheduledAppointments,
        wonAppointments,
        costPerLead,
        bookingPercentage,
        confirmedPercentage,
        outboundDials,
        pickups40Plus,
        conversations2Plus
      });

    } catch (error) {
      console.error('Error fetching detailed stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch detailed statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchDetailedStats(); // Always refresh when opening
    }
  };

  // Refresh stats when date range changes
  useEffect(() => {
    if (open) {
      fetchDetailedStats();
    }
  }, [dateRange, open]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = "blue",
    isPercentage = false,
    isCurrency = false 
  }: {
    title: string;
    value: number;
    icon: any;
    color?: string;
    isPercentage?: boolean;
    isCurrency?: boolean;
  }) => {
    const formatValue = () => {
      if (isCurrency) return `$${value.toFixed(2)}`;
      if (isPercentage) return `${value.toFixed(1)}%`;
      return value.toString();
    };

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{title}</p>
              <p className={`text-2xl font-bold text-${color}-600`}>
                {formatValue()}
              </p>
            </div>
            <Icon className={`h-8 w-8 text-${color}-500`} />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Detailed Stats - {project.project_name}</span>
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span>Loading detailed statistics...</span>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Marketing Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Marketing Metrics</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Ad Spend"
                  value={stats.adSpend}
                  icon={DollarSign}
                  color="green"
                  isCurrency
                />
                <StatCard
                  title="New Leads"
                  value={stats.newLeads}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Cost Per Lead"
                  value={stats.costPerLead}
                  icon={Target}
                  color="purple"
                  isCurrency
                />
              </div>
            </div>

            {/* Appointment Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Appointment Metrics</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Booked"
                  value={stats.bookedAppointments}
                  icon={Calendar}
                  color="blue"
                />
                <StatCard
                  title="New/Unconfirmed"
                  value={stats.newAppointments}
                  icon={Clock}
                  color="yellow"
                />
                <StatCard
                  title="Confirmed"
                  value={stats.confirmedAppointments}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="Rescheduled"
                  value={stats.rescheduledAppointments}
                  icon={Calendar}
                  color="orange"
                />
              </div>
            </div>

            {/* Show/Outcome Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Appointment Outcomes</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Showed"
                  value={stats.showedAppointments}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="No Shows"
                  value={stats.noShowAppointments}
                  icon={XCircle}
                  color="red"
                />
                <StatCard
                  title="Cancelled"
                  value={stats.cancelledAppointments}
                  icon={XCircle}
                  color="gray"
                />
                <StatCard
                  title="Won (Converted)"
                  value={stats.wonAppointments}
                  icon={Target}
                  color="purple"
                />
              </div>
            </div>

            {/* Call Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>Call Metrics</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Outbound Dials"
                  value={stats.outboundDials}
                  icon={Phone}
                  color="blue"
                />
                <StatCard
                  title="Pickups (40+ Seconds)"
                  value={stats.pickups40Plus}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="Conversations (2+ Minutes)"
                  value={stats.conversations2Plus}
                  icon={Clock}
                  color="purple"
                />
                <StatCard
                  title="Booking Percentage"
                  value={stats.bookingPercentage}
                  icon={Target}
                  color="orange"
                  isPercentage
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
