import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import AllAppointmentsManager from '@/components/AllAppointmentsManager';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectStatsCards } from '@/components/projects/ProjectStatsCards';
import { ProjectPasswordPrompt } from '@/components/projects/ProjectPasswordPrompt';
import { useProjectPortalAuth } from '@/hooks/useProjectPortalAuth';
import { isAppointmentConfirmed } from '@/utils/appointmentUtils';
import TagManager from '@/components/projects/TagManager';

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

const ProjectPortal = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTagManager, setShowTagManager] = useState(false);
  const [stats, setStats] = useState<AppointmentStats>({
    totalAppointments: 0,
    totalShowed: 0,
    totalProceduresOrdered: 0,
    projectedRevenue: 0
  });
  const { toast } = useToast();

  const {
    isAuthenticated,
    loading: authLoading,
    error: authError,
    verifyPassword
  } = useProjectPortalAuth(projectName || '');

  useEffect(() => {
    console.log('ProjectPortal mounted with projectName:', projectName);
    if (projectName && isAuthenticated === true) {
      fetchProject();
      fetchAppointmentStats();
    }
  }, [projectName, isAuthenticated]);

  // Show password prompt if authentication is required
  if (authLoading) {
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

  if (isAuthenticated === false) {
    return (
      <ProjectPasswordPrompt
        projectName={decodeURIComponent(projectName || '')}
        onPasswordSubmit={verifyPassword}
        error={authError}
        loading={authLoading}
      />
    );
  }

  const fetchProject = async () => {
    try {
      setLoading(true);
      console.log('Fetching project with name:', projectName);
      
      const decodedProjectName = decodeURIComponent(projectName!);
      console.log('Decoded project name:', decodedProjectName);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('project_name', decodedProjectName)
        .single();
      
      if (error) {
        console.error('Error fetching project:', error);
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
      
      console.log('Project data fetched:', data);
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
      const decodedProjectName = decodeURIComponent(projectName!);
      console.log('Fetching appointment stats for project:', decodedProjectName);
      
      // Fetch all appointments for this project and filter for confirmed ones
      const { data, error } = await supabase
        .from('all_appointments')
        .select('showed, procedure_ordered, confirmed, status')
        .eq('project_name', decodedProjectName);
      
      if (error) {
        console.error('Error fetching appointment stats:', error);
        throw error;
      }
      
      console.log('Raw appointment data:', data);
      
      // Filter for confirmed appointments using standardized logic
      const confirmedAppointments = data?.filter(isAppointmentConfirmed) || [];
      
      console.log('Confirmed appointments:', confirmedAppointments);
      
      const totalAppointments = confirmedAppointments.length;
      const totalShowed = confirmedAppointments.filter(apt => apt.showed === true).length;
      const totalProceduresOrdered = confirmedAppointments.filter(apt => apt.procedure_ordered === true).length;
      const projectedRevenue = totalProceduresOrdered * 7000;
      
      const calculatedStats = {
        totalAppointments,
        totalShowed,
        totalProceduresOrdered,
        projectedRevenue
      };
      
      console.log('Calculated stats:', calculatedStats);
      setStats(calculatedStats);
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Project Header */}
        <ProjectHeader projectName={project.project_name} />

        {/* Stats Cards */}
        <ProjectStatsCards stats={stats} />

        {/* Tag Manager Section with Toggle */}
        <Card>
          <div className="p-4">
            <Button
              variant="ghost"
              onClick={() => setShowTagManager(!showTagManager)}
              className="flex items-center space-x-2 text-left p-0 h-auto font-medium"
            >
              {showTagManager ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Tag className="h-4 w-4" />
              <span>Tag Manager</span>
            </Button>
            
            {showTagManager && (
              <div className="mt-4">
                <TagManager projectId={project.id} projectName={project.project_name} />
              </div>
            )}
          </div>
        </Card>

        {/* Appointments Section - Only confirmed appointments for status updates */}
        <AllAppointmentsManager 
          projectFilter={project.project_name} 
          isProjectPortal={true}
        />
      </div>
    </div>
  );
};

export default ProjectPortal;
