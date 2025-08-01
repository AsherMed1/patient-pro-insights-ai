
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useProjectAuth } from '@/hooks/useProjectAuth';
import AllAppointmentsManager from '@/components/AllAppointmentsManager';
import { ProjectDetailedDashboard } from '@/components/projects/ProjectDetailedDashboard';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectStatsCards } from '@/components/projects/ProjectStatsCards';
import TeamMessageBubble from '@/components/TeamMessageBubble';
import DateRangeFilter from '@/components/projects/DateRangeFilter';

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
      let query = supabase
        .from('all_appointments')
        .select('showed, procedure_ordered, date_appointment_created')
        .eq('project_name', decodeURIComponent(projectName!));

      // Apply date filter if range is selected
      if (dateRange.from) {
        query = query.gte('date_appointment_created', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange.to) {
        query = query.lte('date_appointment_created', dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const totalAppointments = data?.length || 0;
      const totalShowed = data?.filter(apt => apt.showed === true).length || 0;
      const totalProceduresOrdered = data?.filter(apt => apt.procedure_ordered === true).length || 0;
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

  if (loading) {
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
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-2">
          <Link to="/">
            <Button variant="outline" className="hover:bg-accent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          {/* Success indicator - will auto-hide after improvements */}
          <div className="text-sm text-green-600 font-medium">
            ✓ Login Successful
          </div>
        </div>

        {/* Project Header with enhanced typography */}
        <ProjectHeader projectName={project.project_name} />

        {/* Date Range Filter */}
        <DateRangeFilter 
          dateRange={dateRange} 
          onDateRangeChange={setDateRange}
          className="mb-6"
        />

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

        {/* Enhanced Appointments Section */}
        <div className="portal-section">
          <AllAppointmentsManager projectFilter={project.project_name} />
        </div>
        
        {/* Team Communication */}
        <div className="portal-section">
          <h3 className="text-lg font-semibold text-foreground mb-4">Team Communication</h3>
          <TeamMessageBubble projectName={project.project_name} />
        </div>
      </div>
    </div>
  );
};

export default ProjectPortal;
