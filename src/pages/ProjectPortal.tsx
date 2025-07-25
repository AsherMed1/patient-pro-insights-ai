import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import AllAppointmentsManager from '@/components/AllAppointmentsManager';
import { ProjectDetailedDashboard } from '@/components/projects/ProjectDetailedDashboard';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectStatsCards } from '@/components/projects/ProjectStatsCards';

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
  const [stats, setStats] = useState<AppointmentStats>({
    totalAppointments: 0,
    totalShowed: 0,
    totalProceduresOrdered: 0,
    projectedRevenue: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    if (projectName) {
      fetchProject();
      fetchAppointmentStats();
    }
  }, [projectName]);

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
      // Fetch all appointments for this project and filter for confirmed ones
      const { data, error } = await supabase
        .from('all_appointments')
        .select('showed, procedure_ordered, confirmed, status')
        .eq('project_name', decodeURIComponent(projectName!));
      
      if (error) throw error;
      
      // Filter for confirmed appointments (either confirmed boolean is true OR status is 'Confirmed')
      const confirmedAppointments = data?.filter(apt => {
        return apt.confirmed === true || 
               (apt.status && apt.status.toLowerCase() === 'confirmed');
      }) || [];
      
      const totalAppointments = confirmedAppointments.length;
      const totalShowed = confirmedAppointments.filter(apt => apt.showed === true).length;
      const totalProceduresOrdered = confirmedAppointments.filter(apt => apt.procedure_ordered === true).length;
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with back button only */}
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Project Header */}
        <ProjectHeader projectName={project.project_name} />

        {/* Stats Cards */}
        <ProjectStatsCards stats={stats} />

        {/* Small detailed analytics link below stats */}
        <div className="text-center">
          <ProjectDetailedDashboard project={project}>
            <button className="text-sm text-blue-600 hover:text-blue-800 underline">
              View detailed analytics
            </button>
          </ProjectDetailedDashboard>
        </div>

        {/* Appointments Section - Only confirmed appointments */}
        <AllAppointmentsManager 
          projectFilter={project.project_name} 
          isProjectPortal={true}
        />
      </div>
    </div>
  );
};

export default ProjectPortal;
