
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FolderPlus, Lock, Key } from "lucide-react";
import { ProjectFormData } from './types';

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectFormData) => void;
}

export const AddProjectDialog = ({ open, onOpenChange, onSubmit }: AddProjectDialogProps) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    project_name: '',
    portal_password: '',
    ghl_api_key: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ project_name: '', portal_password: '', ghl_api_key: '' });
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-10 px-6">
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-left space-y-3">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Set up a new project with optional security and integration features.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name Section */}
          <div className="space-y-2">
            <Label htmlFor="project_name" className="text-sm font-medium flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
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
                placeholder="Optional - protects project access"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for public access, or set a password to restrict portal entry
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
                placeholder="Optional - for appointment status webhooks"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Required only if you plan to use webhook integrations for appointment updates
              </p>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="px-6">
              Cancel
            </Button>
            <Button type="submit" className="px-6">
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
