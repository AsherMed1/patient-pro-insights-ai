
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, TrendingUp, Phone, Users, Target, DollarSign, CheckCircle, XCircle, Clock, ChevronDown, MapPin, Stethoscope } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  dateRange: externalDateRange
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [internalDateRange, setInternalDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState({
    marketing: false,
    appointment: false,
    outcome: false,
    call: false
  });
  const { toast } = useToast();

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Use internal date range if set, otherwise fall back to external
  const dateRange = internalDateRange.from || internalDateRange.to ? internalDateRange : externalDateRange;

  const setQuickDateRange = (days: number | 'today') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (days === 'today') {
      setInternalDateRange({ from: today, to: today });
    } else {
      const from = new Date();
      from.setDate(from.getDate() - days);
      from.setHours(0, 0, 0, 0);
      setInternalDateRange({ from, to: today });
    }
  };

  const clearDateRange = () => {
    setInternalDateRange({ from: undefined, to: undefined });
  };

  const clearAllFilters = () => {
    setInternalDateRange({ from: undefined, to: undefined });
    setLocationFilter('ALL');
    setServiceFilter('ALL');
  };

  const fetchLocationAndServiceOptions = async () => {
    try {
      const { data } = await supabase
        .from('all_appointments')
        .select('calendar_name')
        .not('calendar_name', 'is', null)
        .eq('project_name', project.project_name);
      
      if (data) {
        const locations = new Set<string>();
        const services = new Set<string>();
        
        data.forEach(item => {
          if (item.calendar_name) {
            // Extract location: try hyphen pattern first, then "at" pattern
            let locationMatch = item.calendar_name.match(/ - (.+)$/);
            if (!locationMatch) {
              locationMatch = item.calendar_name.match(/at\s+(.+)$/);
            }
            
            if (locationMatch && locationMatch[1]) {
              const location = locationMatch[1].trim();
              locations.add(location);
            }
            
            // Extract service
            const serviceMatch = item.calendar_name.match(/your\s+["']?([^"']+)["']?\s+Consultation/i);
            if (serviceMatch && serviceMatch[1]) {
              services.add(serviceMatch[1].trim());
            }
          }
        });
        
        setLocationOptions(Array.from(locations).sort());
        setServiceOptions(Array.from(services).sort());
      }
    } catch (error) {
      console.error('Error fetching location/service options:', error);
    }
  };

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

      // Apply location filter
      if (locationFilter && locationFilter !== 'ALL') {
        appointmentsQuery = appointmentsQuery.ilike('calendar_name', `%${locationFilter}%`);
      }

      // Apply service filter
      if (serviceFilter && serviceFilter !== 'ALL') {
        appointmentsQuery = appointmentsQuery.ilike('calendar_name', `%${serviceFilter}%`);
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
  }, [dateRange, locationFilter, serviceFilter, open]);

  useEffect(() => {
    if (open) {
      fetchLocationAndServiceOptions();
    }
  }, [open]);

  // Auto-reconciliation removed - use manual CSV sync via Google Sheets webhook instead

  const getDateRangeText = () => {
    if (!dateRange?.from && !dateRange?.to) return "All Time";
    if (dateRange.from && dateRange.to) {
      const from = dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const to = dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${from} - ${to}`;
    }
    if (dateRange.from) {
      return `From ${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return `Until ${dateRange.to?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
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

        {/* Date Range Filters */}
        <div className="space-y-3 py-3 border-b">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
            <Button
              variant={internalDateRange.from && !internalDateRange.to ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickDateRange('today')}
            >
              Today
            </Button>
            <Button
              variant={internalDateRange.from && Math.floor((new Date().getTime() - internalDateRange.from.getTime()) / (1000 * 60 * 60 * 24)) === 6 ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickDateRange(7)}
            >
              Week
            </Button>
            <Button
              variant={internalDateRange.from && Math.floor((new Date().getTime() - internalDateRange.from.getTime()) / (1000 * 60 * 60 * 24)) === 29 ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickDateRange(30)}
            >
              Monthly
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange(90)}
            >
              Last 90 Days
            </Button>
            {(internalDateRange.from || internalDateRange.to || locationFilter !== 'ALL' || serviceFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
              >
                Clear All
              </Button>
            )}
            <span className="text-sm text-muted-foreground ml-auto">
              {getDateRangeText()}
            </span>
          </div>

          {/* Location and Service Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Locations</SelectItem>
                  {locationOptions.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Services</SelectItem>
                  {serviceOptions.map(service => (
                    <SelectItem key={service} value={service}>{service}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(locationFilter !== 'ALL' || serviceFilter !== 'ALL') && (
              <Badge variant="secondary" className="py-1">
                {locationFilter !== 'ALL' && locationFilter}
                {locationFilter !== 'ALL' && serviceFilter !== 'ALL' && ' • '}
                {serviceFilter !== 'ALL' && serviceFilter}
              </Badge>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span>Loading detailed statistics...</span>
          </div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Marketing Metrics */}
            <Collapsible open={openSections.marketing} onOpenChange={() => toggleSection('marketing')}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Marketing Metrics</span>
                  </h3>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.marketing ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
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
              </CollapsibleContent>
            </Collapsible>

            {/* Appointment Metrics */}
            <Collapsible open={openSections.appointment} onOpenChange={() => toggleSection('appointment')}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Appointment Metrics</span>
                  </h3>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.appointment ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3">
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
              </CollapsibleContent>
            </Collapsible>

            {/* Show/Outcome Metrics */}
            <Collapsible open={openSections.outcome} onOpenChange={() => toggleSection('outcome')}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Appointment Outcomes</span>
                  </h3>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.outcome ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3">
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
              </CollapsibleContent>
            </Collapsible>

            {/* Call Metrics */}
            <Collapsible open={openSections.call} onOpenChange={() => toggleSection('call')}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Phone className="h-5 w-5" />
                    <span>Call Metrics</span>
                  </h3>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.call ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3">
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
              </CollapsibleContent>
            </Collapsible>
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
