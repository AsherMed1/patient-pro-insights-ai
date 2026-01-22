
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Settings, RefreshCw, Calendar, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import AllAppointmentsManager from '@/components/AllAppointmentsManager';
import { ProjectDetailedDashboard } from '@/components/projects/ProjectDetailedDashboard';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectStatsCards } from '@/components/projects/ProjectStatsCards';
import DateRangeFilter from '@/components/projects/DateRangeFilter';
import { ProjectSwitcher } from '@/components/ProjectSwitcher';
import { SupportWidget } from '@/components/support-widget/SupportWidget';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarDetailView } from '@/components/appointments/CalendarDetailView';
import DetailedAppointmentView from '@/components/appointments/DetailedAppointmentView';
import { AllAppointment } from '@/components/appointments/types';
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, format } from 'date-fns';
// Temporary: Trigger Vivid Vascular re-parsing with fixed GHL fetch
import '@/utils/retriggerVividVascularParsing';

interface Project {
  id: string;
  project_name: string;
  created_at: string;
  updated_at: string;
}

interface AppointmentStats {
  totalAppointments: number;
  totalShowed: number;
  totalProceduresOrdered: number;
  projectedRevenue: number;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const ProjectPortal = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const { user, signOut } = useAuth();
  const { role, loading: roleLoading, hasProjectAccess, accessibleProjects, hasManagementAccess } = useRole();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [canViewOverview, setCanViewOverview] = useState(true);
  const [stats, setStats] = useState<AppointmentStats>({
    totalAppointments: 0,
    totalShowed: 0,
    totalProceduresOrdered: 0,
    projectedRevenue: 0
  });
  const [dateRange, setDateRange] = useState<DateRange>({ 
    from: undefined, 
    to: undefined 
  });
  const [activeTab, setActiveTab] = useState("appointments");
  const [appointmentFilters, setAppointmentFilters] = useState<{
    statusFilter?: string;
    procedureFilter?: string;
    tab?: string;
  }>({});
  const [isReparsing, setIsReparsing] = useState(false);
  const { toast } = useToast();

  // Calendar state
  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AllAppointment | null>(null);

  // Calendar navigation helpers
  const goToPrevious = () => {
    setSelectedCalendarDate(prev => {
      if (calendarViewMode === 'day') return subDays(prev, 1);
      if (calendarViewMode === 'week') return subWeeks(prev, 1);
      return subMonths(prev, 1);
    });
  };

  const goToNext = () => {
    setSelectedCalendarDate(prev => {
      if (calendarViewMode === 'day') return addDays(prev, 1);
      if (calendarViewMode === 'week') return addWeeks(prev, 1);
      return addMonths(prev, 1);
    });
  };

  const goToToday = () => {
    setSelectedCalendarDate(new Date());
  };

  // Fetch overview permission for project users
  useEffect(() => {
    const fetchOverviewPermission = async () => {
      if (!user || !project || role !== 'project_user') {
        // Admins and agents always see overview
        setCanViewOverview(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('project_user_access')
          .select('can_view_overview')
          .eq('user_id', user.id)
          .eq('project_id', project.id)
          .single();

        if (error) {
          console.error('Error fetching overview permission:', error);
          return;
        }

        setCanViewOverview(data?.can_view_overview ?? true);
      } catch (error) {
        console.error('Error fetching overview permission:', error);
      }
    };

    fetchOverviewPermission();
  }, [user, project, role]);

  // Check if user has access to this specific project (after role data loads)
  useEffect(() => {
    if (roleLoading || !role) return; // Wait for role data to load
    
    if (projectName) {
      const decodedProjectName = decodeURIComponent(projectName);
      
      // For project users, wait until we have project access data
      if (role === 'project_user' && accessibleProjects.length === 0) {
        console.log('🕐 [ProjectPortal] Waiting for project access data...');
        return;
      }
      
      // Only check access after we have complete data
      if (!hasProjectAccess(decodedProjectName)) {
        console.log('❌ [ProjectPortal] Access denied to project:', decodedProjectName);
        toast({
          title: "Access Denied",
          description: "You don't have access to this project.",
          variant: "destructive",
        });
        signOut();
      }
    }
  }, [projectName, role, roleLoading, hasProjectAccess, accessibleProjects, toast, signOut]);

  useEffect(() => {
    if (projectName) {
      fetchProject();
      fetchAppointmentStats();
    }
  }, [projectName, dateRange]);

  // Reset appointment filters when navigating away from appointments tab
  useEffect(() => {
    if (activeTab !== 'appointments') {
      setAppointmentFilters({});
    }
  }, [activeTab]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('project_name', decodeURIComponent(projectName!))
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Project Not Found",
            description: "The requested project does not exist.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: "Error",
        description: "Failed to fetch project details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentStats = async () => {
    try {
      const decodedName = decodeURIComponent(projectName!);
      let query = supabase
        .from('all_appointments')
        .select('procedure_ordered, date_appointment_created, status, date_of_appointment, was_ever_confirmed');
      
      if (decodedName.trim() !== decodedName) {
        query = query.or(`project_name.eq.${decodedName},project_name.eq.${decodedName.trim()}`);
      } else {
        query = query.eq('project_name', decodedName);
      }

      // Apply date filter if range is selected
      if (dateRange.from) {
        query = query.gte('date_appointment_created', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange.to) {
        query = query.lte('date_appointment_created', dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Normalize and compute stats
      const visibleAppointments = data || [];
      const normalizeStatus = (s?: string) => (s ?? '').toString().trim().toLowerCase();
      
      const totalAppointments = visibleAppointments.length;
      const totalShowed = visibleAppointments.filter(apt => normalizeStatus(apt.status) === 'showed').length;
      const totalProceduresOrdered = visibleAppointments.filter(apt => apt.procedure_ordered === true).length;
      const projectedRevenue = totalProceduresOrdered * 7000;
      
      setStats({
        totalAppointments,
        totalShowed,
        totalProceduresOrdered,
        projectedRevenue
      });
    } catch (error) {
      console.error('Error fetching appointment stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointment statistics",
        variant: "destructive",
      });
    }
  };

  const handleStatsCardClick = (filter: 'all' | 'showed' | 'procedures') => {
    // Switch to appointments tab with smooth animation
    setActiveTab('appointments');
    
    // Set appropriate filters based on which card was clicked
    switch (filter) {
      case 'all':
        setAppointmentFilters({
          statusFilter: 'ALL',
          procedureFilter: 'ALL',
          tab: 'all'
        });
        break;
      case 'showed':
        setAppointmentFilters({
          statusFilter: 'Showed', // Capital S to match status options
          procedureFilter: 'ALL',
          tab: 'all' // Use 'all' tab to avoid conflicts with tab-specific filtering
        });
        break;
      case 'procedures':
        setAppointmentFilters({
          statusFilter: 'ALL',
          procedureFilter: 'true',
          tab: 'all'
        });
        break;
    }
  };

  const handleReparse = async () => {
    if (!project) return;
    
    setIsReparsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-reparse', {
        body: { project_name: project.project_name }
      });

      if (error) throw error;

      toast({
        title: "Re-parsing Initiated",
        description: `Queued ${data.appointments + data.leads} records for re-parsing. Patient Pro Insights will update within 5-10 minutes.`,
      });
    } catch (error) {
      console.error('Error triggering re-parse:', error);
      toast({
        title: "Error",
        description: "Failed to trigger re-parsing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReparsing(false);
    }
  };

  // Show loading while role data or project data is loading
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-8">
            <span>Loading project...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Link to="/">
            <Button variant="outline" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
                <p className="text-gray-600">The requested project could not be found.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto portal-spacing">
        {/* Header with user info, project switcher, and sign out */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Welcome, {user?.email}
            </div>
            <ProjectSwitcher 
              currentProject={project.project_name} 
              showBackToDashboard={true}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Link to="/settings">
              <Button variant="outline" className="hover:bg-accent">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            <Button variant="outline" onClick={signOut} className="hover:bg-accent">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Project Header with enhanced typography */}
        <ProjectHeader projectName={project.project_name} />

        {/* Tabbed Interface */}
        <Tabs defaultValue="appointments" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${canViewOverview ? 'grid-cols-2' : 'grid-cols-1'} mb-6`}>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            {canViewOverview && (
              <TabsTrigger value="overview">Overview</TabsTrigger>
            )}
          </TabsList>

          {canViewOverview && (
            <TabsContent value="overview" className="space-y-6">
              {/* Date Range Filter */}
              <DateRangeFilter 
                dateRange={dateRange} 
                onDateRangeChange={setDateRange}
                className="mb-6"
              />

              {/* Admin: Re-parse Button */}
              {role === 'admin' && (
                <div className="flex justify-end mb-4">
                  <Button 
                    onClick={handleReparse} 
                    disabled={isReparsing}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isReparsing ? 'animate-spin' : ''}`} />
                    {isReparsing ? 'Re-parsing...' : 'Re-parse All Records'}
                  </Button>
                </div>
              )}

              {/* Enhanced Stats Cards with medical context */}
              <ProjectStatsCards stats={stats} onCardClick={handleStatsCardClick} />

              {/* Detailed Analytics - Better positioned (admin/agent only) */}
              {hasManagementAccess() && (
                <div className="text-center py-4">
                  <ProjectDetailedDashboard project={project} dateRange={dateRange}>
                    <Button variant="link" className="text-primary hover:text-primary/80 text-sm underline-offset-4">
                      📊 View detailed analytics dashboard
                    </Button>
                  </ProjectDetailedDashboard>
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="appointments">
            {/* View Toggle Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant={!showCalendarView ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCalendarView(false)}
                >
                  <List className="h-4 w-4 mr-2" />
                  List View
                </Button>
                <Button 
                  variant={showCalendarView ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCalendarView(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar View
                </Button>
              </div>
              
              {/* Calendar Controls - only shown when calendar is active */}
              {showCalendarView && (
                <div className="flex items-center gap-4">
                  {/* Date Navigation */}
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={goToPrevious}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToNext}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Current Date Display */}
                  <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
                    {format(selectedCalendarDate, calendarViewMode === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}
                  </span>
                  
                  {/* View Mode Toggle */}
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={`rounded-none ${calendarViewMode === 'day' ? 'bg-muted' : ''}`}
                      onClick={() => setCalendarViewMode('day')}
                    >
                      Day
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={`rounded-none border-x border-border ${calendarViewMode === 'week' ? 'bg-muted' : ''}`}
                      onClick={() => setCalendarViewMode('week')}
                    >
                      Week
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={`rounded-none ${calendarViewMode === 'month' ? 'bg-muted' : ''}`}
                      onClick={() => setCalendarViewMode('month')}
                    >
                      Month
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Content Area - Full Width */}
            {showCalendarView ? (
              <div className="portal-section h-[calc(100vh-320px)] flex flex-col">
                <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden">
                  <CalendarDetailView
                    projectName={project.project_name}
                    selectedDate={selectedCalendarDate}
                    viewMode={calendarViewMode}
                    onAppointmentClick={(apt) => setSelectedAppointment(apt)}
                    onDateSelect={(date) => {
                      setSelectedCalendarDate(date);
                      setCalendarViewMode('day');
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="portal-section">
                <AllAppointmentsManager 
                  projectFilter={project.project_name} 
                  onDataChanged={fetchAppointmentStats}
                  initialStatusFilter={appointmentFilters.statusFilter}
                  initialProcedureFilter={appointmentFilters.procedureFilter}
                  initialTab={appointmentFilters.tab}
                />
              </div>
            )}

            {/* Appointment Detail Modal */}
            {selectedAppointment && (
              <DetailedAppointmentView
                appointment={selectedAppointment}
                isOpen={!!selectedAppointment}
                onClose={() => setSelectedAppointment(null)}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Floating chat widget for quick access */}
        <SupportWidget projectName={project.project_name} />
      </div>
    </div>
  );
};

export default ProjectPortal;
