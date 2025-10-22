
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import AllAppointmentsManager from '@/components/AllAppointmentsManager';
import { ProjectDetailedDashboard } from '@/components/projects/ProjectDetailedDashboard';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectStatsCards } from '@/components/projects/ProjectStatsCards';
import TeamMessageBubble from '@/components/TeamMessageBubble';
import DateRangeFilter from '@/components/projects/DateRangeFilter';
import { ProjectSwitcher } from '@/components/ProjectSwitcher';
import ProjectChat from '@/components/ProjectChat';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  const { role, loading: roleLoading, hasProjectAccess, accessibleProjects } = useRole();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
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
  const { toast } = useToast();

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
          
          <Button variant="outline" onClick={signOut} className="hover:bg-accent">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Project Header with enhanced typography */}
        <ProjectHeader projectName={project.project_name} />

        {/* Date Range Filter */}
        <DateRangeFilter 
          dateRange={dateRange} 
          onDateRangeChange={setDateRange}
          className="mb-6"
        />

        {/* Tabbed Interface */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Enhanced Stats Cards with medical context */}
            <ProjectStatsCards stats={stats} />

            {/* Detailed Analytics - Better positioned */}
            <div className="text-center py-4">
              <ProjectDetailedDashboard project={project} dateRange={dateRange}>
                <Button variant="link" className="text-primary hover:text-primary/80 text-sm underline-offset-4">
                  📊 View detailed analytics dashboard
                </Button>
              </ProjectDetailedDashboard>
            </div>
          </TabsContent>

          <TabsContent value="appointments">
            <div className="portal-section">
              <AllAppointmentsManager projectFilter={project.project_name} onDataChanged={fetchAppointmentStats} />
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <ProjectChat projectName={project.project_name} />
          </TabsContent>
        </Tabs>

        {/* Keep floating message bubble for quick access */}
        <TeamMessageBubble projectName={project.project_name} />
      </div>
    </div>
  );
};

export default ProjectPortal;
