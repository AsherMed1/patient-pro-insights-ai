
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectFormData } from '../types';

export const useProjectOperations = () => {
  const { toast } = useToast();

  const addProject = async (data: ProjectFormData) => {
    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          project_name: data.project_name,
          portal_password: data.portal_password || null,
          active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project added successfully",
      });

      return true;
    } catch (error) {
      console.error('Error adding project:', error);
      toast({
        title: "Error",
        description: "Failed to add project",
        variant: "destructive",
      });
      return false;
    }
  };

  const editProject = async (project: Project, data: ProjectFormData) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          project_name: data.project_name,
          portal_password: data.portal_password || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleProjectStatus = async (project: Project) => {
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

      return true;
    } catch (error) {
      console.error('Error toggling project status:', error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteProject = async (project: Project) => {
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

      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    addProject,
    editProject,
    toggleProjectStatus,
    deleteProject,
  };
};
