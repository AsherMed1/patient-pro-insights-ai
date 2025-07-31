
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

interface ProjectDetailedDashboardProps {
  project: Project;
  children: React.ReactNode;
}

interface DashboardStats {
  adSpend: number;
  newLeads: number;
  bookedAppointments: number;
  noShows: number;
  confirmedAppointments: number;
  costPerLead: number;
  bookingPercentage: number;
  shows: number;
  unconfirmedAppointments: number;
  appointmentsToTakePlace: number;
  confirmedPercentage: number;
  outboundDials: number;
  pickups40Plus: number;
  conversations2Plus: number;
}

export const ProjectDetailedDashboard: React.FC<ProjectDetailedDashboardProps> = ({
  project,
  children
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const fetchDetailedStats = async () => {
    try {
      setLoading(true);
      
      // Fetch leads
      const { data: leads, error: leadsError } = await supabase
        .from('new_leads')
        .select('*')
        .eq('project_name', project.project_name);
      
      if (leadsError) throw leadsError;

      // Fetch appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('all_appointments')
        .select('*')
        .eq('project_name', project.project_name);
      
      if (appointmentsError) throw appointmentsError;

      // Fetch calls
      const { data: calls, error: callsError } = await supabase
        .from('all_calls')
        .select('*')
        .eq('project_name', project.project_name);
      
      if (callsError) throw callsError;

      // Calculate stats
      const newLeads = leads?.length || 0;
      const bookedAppointments = appointments?.length || 0;
      const shows = appointments?.filter(apt => apt.showed).length || 0;
      const noShows = appointments?.filter(apt => apt.showed === false).length || 0;
      // Use same logic as tabs: appointments with both status and procedure_ordered completed
      const confirmedAppointments = appointments?.filter(apt => 
        apt.status !== null && apt.procedure_ordered !== null
      ).length || 0;
      const unconfirmedAppointments = bookedAppointments - confirmedAppointments;
      const appointmentsToTakePlace = appointments?.filter(apt => 
        new Date(apt.date_of_appointment) >= new Date()
      ).length || 0;
      
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
        noShows,
        confirmedAppointments,
        costPerLead,
        bookingPercentage,
        shows,
        unconfirmedAppointments,
        appointmentsToTakePlace,
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
    if (newOpen && !stats) {
      fetchDetailedStats();
    }
  };

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
                  title="Booked Appointments"
                  value={stats.bookedAppointments}
                  icon={Calendar}
                  color="blue"
                />
                <StatCard
                  title="Confirmed Appointments"
                  value={stats.confirmedAppointments}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="Unconfirmed Appointments"
                  value={stats.unconfirmedAppointments}
                  icon={Clock}
                  color="yellow"
                />
                <StatCard
                  title="Appointments To Take Place"
                  value={stats.appointmentsToTakePlace}
                  icon={Calendar}
                  color="purple"
                />
              </div>
            </div>

            {/* Show Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Show Metrics</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Shows"
                  value={stats.shows}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="No Shows"
                  value={stats.noShows}
                  icon={XCircle}
                  color="red"
                />
                <StatCard
                  title="Confirmed Percentage"
                  value={stats.confirmedPercentage}
                  icon={Target}
                  color="blue"
                  isPercentage
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
