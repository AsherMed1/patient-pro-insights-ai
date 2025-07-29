import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Edit, Save, X, ExternalLink } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  project_name: string;
  portal_password: string | null;
  active: boolean;
}

export const ProjectPasswordManager: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, portal_password, active')
        .eq('active', true)
        .order('project_name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (projectId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(projectId)) {
      newVisible.delete(projectId);
    } else {
      newVisible.add(projectId);
    }
    setVisiblePasswords(newVisible);
  };

  const startEditing = (projectId: string, currentPassword: string | null) => {
    setEditingProject(projectId);
    setNewPassword(currentPassword || '');
  };

  const cancelEditing = () => {
    setEditingProject(null);
    setNewPassword('');
  };

  const savePassword = async (projectId: string) => {
    try {
      // Hash the password using the database function
      const { data: hashedPassword, error: hashError } = await supabase
        .rpc('hash_password', { password: newPassword });

      if (hashError) throw hashError;

      const { error } = await supabase
        .from('projects')
        .update({ portal_password: hashedPassword })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setEditingProject(null);
      setNewPassword('');
      fetchProjects();
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading projects...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Password Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium">{project.project_name}</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <Label className="text-sm text-muted-foreground">Password:</Label>
                  {editingProject === project.id ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-48"
                      />
                      <Button
                        size="sm"
                        onClick={() => savePassword(project.id)}
                        disabled={!newPassword.trim()}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm">
                        {project.portal_password ? (
                          visiblePasswords.has(project.id) ? 
                            <span className="text-amber-600">Password is hashed - cannot reveal</span> :
                            '••••••••'
                        ) : (
                          <span className="text-muted-foreground italic">No password set</span>
                        )}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePasswordVisibility(project.id)}
                        disabled={!project.portal_password}
                      >
                        {visiblePasswords.has(project.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(project.id, '')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Label className="text-sm text-muted-foreground">Login URL:</Label>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {window.location.origin}/project-login/{project.project_name}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`/project-login/${project.project_name}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No active projects found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};