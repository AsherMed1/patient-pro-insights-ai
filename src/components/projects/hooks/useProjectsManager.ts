
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectStats, ProjectFormData } from '../types';

export const useProjectsManager = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const { toast } = useToast();
  const navigate = useNavigate();

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
        const [leadsResult, callsResult, appointmentsResult, adSpendResult] = await Promise.all([
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
            .eq('project_name', project.project_name),
          supabase
            .from('facebook_ad_spend')
            .select('spend')
            .eq('project_name', project.project_name)
        ]);

        // Fetch confirmed appointments - check both confirmed boolean and status field
        const confirmedAppointmentsResult = await supabase
          .from('all_appointments')
          .select('confirmed, status')
          .eq('project_name', project.project_name);

        const confirmedCount = confirmedAppointmentsResult.data?.filter(apt => {
          // Count as confirmed if confirmed boolean is true OR status is "Confirmed" (case-insensitive)
          return apt.confirmed === true || 
                 (apt.status && apt.status.toLowerCase() === 'confirmed');
        }).length || 0;

        const totalAdSpend = adSpendResult.data?.reduce((sum, record) => {
          const spendValue = typeof record.spend === 'string' ? parseFloat(record.spend) : Number(record.spend);
          return sum + (isNaN(spendValue) ? 0 : spendValue);
        }, 0) || 0;

        return {
          project_name: project.project_name,
          leads_count: leadsResult.count || 0,
          calls_count: callsResult.count || 0,
          appointments_count: appointmentsResult.count || 0,
          confirmed_appointments_count: confirmedCount,
          ad_spend: totalAdSpend,
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

  const handleAddProject = async (data: ProjectFormData) => {
    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          project_name: data.project_name,
          active: true
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

  const handleToggleProjectStatus = async (project: Project) => {
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
        description: `Project ${!project.active ? 'activated' : 'deactivated'} successfully`,
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

  const handleViewProject = (project: Project) => {
    navigate(`/project/${encodeURIComponent(project.project_name)}`);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };

  return {
    projects,
    projectStats,
    loading,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingProject,
    activeTab,
    setActiveTab,
    handleAddProject,
    handleEditProject,
    handleToggleProjectStatus,
    handleDeleteProject,
    handleViewProject,
    openEditDialog,
  };
};
