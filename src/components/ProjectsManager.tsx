
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FolderOpen, Calendar, Activity } from 'lucide-react';

interface Project {
  id: string;
  project_name: string;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  project_name: string;
  leads_count: number;
  calls_count: number;
  appointments_count: number;
  last_activity: string | null;
}

const ProjectsManager = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjectsAndStats();
  }, []);

  const fetchProjectsAndStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch stats for each project
      const statsPromises = (projectsData || []).map(async (project) => {
        const [leadsResult, callsResult, appointmentsResult] = await Promise.all([
          supabase
            .from('new_leads')
            .select('id', { count: 'exact', head: true })
            .eq('project_name', project.project_name),
          supabase
            .from('all_calls')
            .select('id, call_datetime', { count: 'exact' })
            .eq('project_name', project.project_name)
            .order('call_datetime', { ascending: false })
            .limit(1),
          supabase
            .from('all_appointments')
            .select('id', { count: 'exact', head: true })
            .eq('project_name', project.project_name)
        ]);

        return {
          project_name: project.project_name,
          leads_count: leadsResult.count || 0,
          calls_count: callsResult.count || 0,
          appointments_count: appointmentsResult.count || 0,
          last_activity: callsResult.data?.[0]?.call_datetime || null
        };
      });

      const stats = await Promise.all(statsPromises);
      setProjectStats(stats);
    } catch (error) {
      console.error('Error fetching projects and stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getActivityStatus = (lastActivity: string | null) => {
    if (!lastActivity) return { status: 'No Activity', color: 'bg-gray-100 text-gray-600' };
    
    const daysSinceActivity = Math.floor(
      (new Date().getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceActivity === 0) return { status: 'Active Today', color: 'bg-green-100 text-green-600' };
    if (daysSinceActivity <= 7) return { status: 'Active This Week', color: 'bg-blue-100 text-blue-600' };
    if (daysSinceActivity <= 30) return { status: 'Active This Month', color: 'bg-yellow-100 text-yellow-600' };
    return { status: 'Inactive', color: 'bg-red-100 text-red-600' };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <span>Loading projects...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FolderOpen className="h-5 w-5" />
          <span>Active Projects</span>
        </CardTitle>
        <CardDescription>
          Overview of all projects and their activity status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No projects found.</p>
            <p className="text-sm">Projects are created automatically when data is synced.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const stats = projectStats.find(s => s.project_name === project.project_name);
              const activityStatus = getActivityStatus(stats?.last_activity || null);
              
              return (
                <Card key={project.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-medium">
                        {project.project_name}
                      </CardTitle>
                      <Badge className={`text-xs ${activityStatus.color}`}>
                        {activityStatus.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="text-lg font-semibold text-blue-600">
                          {stats?.leads_count || 0}
                        </div>
                        <div className="text-xs text-blue-600">Leads</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <div className="text-lg font-semibold text-green-600">
                          {stats?.calls_count || 0}
                        </div>
                        <div className="text-xs text-green-600">Calls</div>
                      </div>
                      <div className="bg-purple-50 p-2 rounded">
                        <div className="text-lg font-semibold text-purple-600">
                          {stats?.appointments_count || 0}
                        </div>
                        <div className="text-xs text-purple-600">Appointments</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created: {formatDate(project.created_at)}</span>
                      </div>
                    </div>
                    
                    {stats?.last_activity && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Activity className="h-3 w-3" />
                        <span>Last activity: {formatDate(stats.last_activity)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectsManager;
