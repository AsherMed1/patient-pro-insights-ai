
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit3, FolderEdit, Lock, Key } from "lucide-react";
import { Project, ProjectFormData } from './types';

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSubmit: (data: ProjectFormData) => void;
}

export const EditProjectDialog = ({ open, onOpenChange, project, onSubmit }: EditProjectDialogProps) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    project_name: '',
    portal_password: '',
    ghl_api_key: ''
  });

  useEffect(() => {
    if (project) {
      setFormData({
        project_name: project.project_name,
        portal_password: project.portal_password || '',
        ghl_api_key: project.ghl_api_key || ''
      });
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-left space-y-3">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit3 className="h-5 w-5 text-primary" />
            Edit Project
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update project settings, security, and integration configurations.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name Section */}
          <div className="space-y-2">
            <Label htmlFor="project_name" className="text-sm font-medium flex items-center gap-2">
              <FolderEdit className="h-4 w-4" />
              Project Name *
            </Label>
            <Input
              id="project_name"
              value={formData.project_name}
              onChange={(e) => handleInputChange('project_name', e.target.value)}
              placeholder="Enter a descriptive project name"
              className="h-11"
              required
            />
          </div>

          {/* Security Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Lock className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm">Security Settings</h4>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="portal_password" className="text-sm font-medium">
                Portal Password
              </Label>
              <Input
                id="portal_password"
                type="password"
                value={formData.portal_password}
                onChange={(e) => handleInputChange('portal_password', e.target.value)}
                placeholder="Leave empty to remove protection"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Clear this field to make the portal publicly accessible
              </p>
            </div>
          </div>

          {/* Integration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Key className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm">Integration Settings</h4>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ghl_api_key" className="text-sm font-medium">
                GoHighLevel API Key
              </Label>
              <Input
                id="ghl_api_key"
                type="password"
                value={formData.ghl_api_key}
                onChange={(e) => handleInputChange('ghl_api_key', e.target.value)}
                placeholder="Leave empty to remove integration"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Clear this field to disable webhook appointment status updates
              </p>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="px-6">
              Cancel
            </Button>
            <Button type="submit" className="px-6">
              Update Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
