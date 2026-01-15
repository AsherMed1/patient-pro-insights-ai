import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  project_name: string;
}

interface ProjectAccess {
  project_id: string;
  can_view_overview: boolean;
}

interface ProjectUserManagerProps {
  userId: string;
  userEmail: string;
}

const ProjectUserManager: React.FC<ProjectUserManagerProps> = ({ userId, userEmail }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProjectAccess, setUserProjectAccess] = useState<Set<string>>(new Set());
  const [overviewPermissions, setOverviewPermissions] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all active projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_name')
        .eq('active', true)
        .order('project_name');

      if (projectsError) throw projectsError;

      // Fetch user's current project access with overview permissions
      const { data: accessData, error: accessError } = await supabase
        .from('project_user_access')
        .select('project_id, can_view_overview')
        .eq('user_id', userId);

      if (accessError) throw accessError;

      setProjects(projectsData || []);
      setUserProjectAccess(new Set(accessData?.map(access => access.project_id) || []));
      
      // Set overview permissions
      const permissionsMap = new Map<string, boolean>();
      accessData?.forEach(access => {
        permissionsMap.set(access.project_id, access.can_view_overview ?? true);
      });
      setOverviewPermissions(permissionsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, userId]);

  const handleProjectToggle = (projectId: string, checked: boolean) => {
    const newAccess = new Set(userProjectAccess);
    if (checked) {
      newAccess.add(projectId);
      // Default to showing overview for new access
      if (!overviewPermissions.has(projectId)) {
        const newPermissions = new Map(overviewPermissions);
        newPermissions.set(projectId, true);
        setOverviewPermissions(newPermissions);
      }
    } else {
      newAccess.delete(projectId);
    }
    setUserProjectAccess(newAccess);
  };

  const handleOverviewToggle = (projectId: string, checked: boolean) => {
    const newPermissions = new Map(overviewPermissions);
    newPermissions.set(projectId, checked);
    setOverviewPermissions(newPermissions);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Get current access from database
      const { data: currentAccess, error: fetchError } = await supabase
        .from('project_user_access')
        .select('project_id')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const currentProjectIds = new Set(currentAccess?.map(access => access.project_id) || []);
      const newProjectIds = userProjectAccess;

      // Find projects to add and remove
      const toAdd = Array.from(newProjectIds).filter(id => !currentProjectIds.has(id));
      const toRemove = Array.from(currentProjectIds).filter(id => !newProjectIds.has(id));

      // Remove access
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('project_user_access')
          .delete()
          .eq('user_id', userId)
          .in('project_id', toRemove);

        if (removeError) throw removeError;
      }

      // Add access with overview permissions
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('project_user_access')
          .insert(
            toAdd.map(projectId => ({
              user_id: userId,
              project_id: projectId,
              can_view_overview: overviewPermissions.get(projectId) ?? true
            }))
          );

        if (addError) throw addError;
      }

      // Update overview permissions for existing access
      for (const projectId of Array.from(newProjectIds)) {
        if (currentProjectIds.has(projectId)) {
          const { error: updateError } = await supabase
            .from('project_user_access')
            .update({ can_view_overview: overviewPermissions.get(projectId) ?? true })
            .eq('user_id', userId)
            .eq('project_id', projectId);

          if (updateError) {
            console.error('Error updating overview permission:', updateError);
          }
        }
      }

      toast({
        title: "Success",
        description: "Project assignments updated successfully",
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to update project assignments",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getAssignedProjectNames = () => {
    return projects
      .filter(project => userProjectAccess.has(project.id))
      .map(project => project.project_name);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Manage Projects
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Project Access</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Assign projects for {userEmail}
          </p>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={project.id}
                      checked={userProjectAccess.has(project.id)}
                      onCheckedChange={(checked) => 
                        handleProjectToggle(project.id, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={project.id} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {project.project_name}
                    </label>
                  </div>
                  
                  {/* Only show toggle if user has access to this project */}
                  {userProjectAccess.has(project.id) && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">Overview</span>
                      <Switch
                        checked={overviewPermissions.get(project.id) ?? true}
                        onCheckedChange={(checked) => 
                          handleOverviewToggle(project.id, checked)
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No projects available
              </p>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveChanges}
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectUserManager;