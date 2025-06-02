
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Calendar, CheckCircle, Stethoscope, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import AllAppointmentsManager from '@/components/AllAppointmentsManager';
import { ProjectDetailedDashboard } from '@/components/projects/ProjectDetailedDashboard';

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
      const { data, error } = await supabase
        .from('all_appointments')
        .select('showed, procedure_ordered')
        .eq('project_name', decodeURIComponent(projectName!));
      
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
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Building className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">{project.project_name}</h1>
          </div>
          <p className="text-xl text-gray-600">Project Portal & Analytics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Appointments</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalAppointments}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Showed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalShowed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Procedures Ordered</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalProceduresOrdered}</p>
                </div>
                <Stethoscope className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Projected Revenue</p>
                  <p className="text-2xl font-bold text-orange-600">${stats.projectedRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Small detailed analytics link below stats */}
        <div className="text-center">
          <ProjectDetailedDashboard project={project}>
            <button className="text-sm text-blue-600 hover:text-blue-800 underline">
              View detailed analytics
            </button>
          </ProjectDetailedDashboard>
        </div>

        {/* Appointments Section */}
        <AllAppointmentsManager projectFilter={project.project_name} />
      </div>
    </div>
  );
};

export default ProjectPortal;
