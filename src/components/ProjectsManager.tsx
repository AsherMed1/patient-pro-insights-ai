
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FolderOpen } from 'lucide-react';
import { ProjectCard } from './projects/ProjectCard';
import { AddProjectDialog } from './projects/AddProjectDialog';
import { EditProjectDialog } from './projects/EditProjectDialog';

interface Project {
  id: string;
  project_name: string;
  created_at: string;
  updated_at: string;
  active: boolean;
  appointment_webhook_url?: string | null;
}

interface ProjectStats {
  project_name: string;
  leads_count: number;
  calls_count: number;
  appointments_count: number;
  last_activity: string | null;
}

interface ProjectFormData {
  project_name: string;
  appointment_webhook_url?: string;
}

const ProjectsManager = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
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
            .select('date, updated_at', { count: 'exact' })
            .eq('project_name', project.project_name)
            .order('updated_at', { ascending: false })
            .limit(1),
          supabase
            .from('all_calls')
            .select('call_datetime, updated_at', { count: 'exact' })
            .eq('project_name', project.project_name)
            .order('call_datetime', { ascending: false })
            .limit(1),
          supabase
            .from('all_appointments')
            .select('date_appointment_created, updated_at', { count: 'exact' })
            .eq('project_name', project.project_name)
            .order('updated_at', { ascending: false })
            .limit(1)
        ]);

        // Find most recent activity across all tables
        const leadActivity = leadsResult.data?.[0]?.updated_at || leadsResult.data?.[0]?.date;
        const callActivity = callsResult.data?.[0]?.call_datetime || callsResult.data?.[0]?.updated_at;
        const appointmentActivity = appointmentsResult.data?.[0]?.updated_at || appointmentsResult.data?.[0]?.date_appointment_created;
        
        const allActivities = [leadActivity, callActivity, appointmentActivity].filter(Boolean);
        const lastActivity = allActivities.length > 0 
          ? new Date(Math.max(...allActivities.map(d => new Date(d).getTime()))).toISOString()
          : null;

        return {
          project_name: project.project_name,
          leads_count: leadsResult.count || 0,
          calls_count: callsResult.count || 0,
          appointments_count: appointmentsResult.count || 0,
          last_activity: lastActivity
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

  const handleAddProject = async (data: ProjectFormData) => {
    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          project_name: data.project_name,
          appointment_webhook_url: data.appointment_webhook_url || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project added successfully",
      });

      setIsAddDialogOpen(false);
      await fetchProjectsAndStats();
    } catch (error) {
      console.error('Error adding project:', error);
      toast({
        title: "Error",
        description: "Failed to add project",
        variant: "destructive",
      });
    }
  };

  const handleEditProject = async (data: ProjectFormData) => {
    if (!editingProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          project_name: data.project_name,
          appointment_webhook_url: data.appointment_webhook_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project updated successfully",
      });

      setIsEditDialogOpen(false);
      setEditingProject(null);
      await fetchProjectsAndStats();
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (project: Project) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          active: !project.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Project ${!project.active ? 'enabled' : 'disabled'} successfully`,
      });

      await fetchProjectsAndStats();
    } catch (error) {
      console.error('Error toggling project status:', error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async (project: Project) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });

      await fetchProjectsAndStats();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5" />
              <span>Active Projects</span>
              <div className="flex items-center space-x-2 text-sm font-normal">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                  {projects.filter(p => p.active).length} Active
                </span>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {projects.filter(p => !p.active).length} Disabled
                </span>
              </div>
            </CardTitle>
            <CardDescription>
              Overview of all projects and their activity status
            </CardDescription>
          </div>
          <AddProjectDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSubmit={handleAddProject}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No projects found.</p>
            <p className="text-sm">Click "Add Project" to create your first project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects
              .filter(project => project && project.project_name)
              .sort((a, b) => {
                // First sort by active status (active projects first)
                if (a.active !== b.active) {
                  return a.active ? -1 : 1;
                }
                // Then sort by updated_at (most recent first)
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
              })
              .map((project) => {
              const stats = projectStats.find(s => s.project_name === project.project_name);
              
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  stats={stats}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteProject}
                  onToggleActive={handleToggleActive}
                />
              );
            })}
          </div>
        )}

        <EditProjectDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          project={editingProject}
          onSubmit={handleEditProject}
        />
      </CardContent>
    </Card>
  );
};

export default ProjectsManager;
