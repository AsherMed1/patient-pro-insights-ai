
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import NewLeadsManager from '@/components/NewLeadsManager';
import AllCallsManager from '@/components/AllCallsManager';
import AllAppointmentsManager from '@/components/AllAppointmentsManager';
import { ProjectDetailedDashboard } from '@/components/projects/ProjectDetailedDashboard';

interface Project {
  id: string;
  project_name: string;
  created_at: string;
  updated_at: string;
}

const ProjectPortal = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leads");
  const { toast } = useToast();

  useEffect(() => {
    if (projectName) {
      fetchProject();
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
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <ProjectDetailedDashboard project={project}>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Detailed Analytics
            </Button>
          </ProjectDetailedDashboard>
        </div>

        {/* Project Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Building className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">{project.project_name}</h1>
          </div>
          <p className="text-xl text-gray-600">Project Portal & Analytics</p>
        </div>

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="calls">Calls</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-6">
            <ProjectLeadsManager projectName={project.project_name} />
          </TabsContent>

          <TabsContent value="calls" className="space-y-6">
            <ProjectCallsManager projectName={project.project_name} />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <ProjectAppointmentsManager projectName={project.project_name} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Project-specific components that filter by project
const ProjectLeadsManager = ({ projectName }: { projectName: string }) => {
  return <NewLeadsManager viewOnly projectFilter={projectName} />;
};

const ProjectCallsManager = ({ projectName }: { projectName: string }) => {
  return <AllCallsManager projectFilter={projectName} />;
};

const ProjectAppointmentsManager = ({ projectName }: { projectName: string }) => {
  return <AllAppointmentsManager projectFilter={projectName} />;
};

export default ProjectPortal;
