
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the project details. Leave password empty to remove protection.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project_name" className="text-right">
                Name
              </Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => handleInputChange('project_name', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="portal_password" className="text-right">
                Portal Password
              </Label>
              <Input
                id="portal_password"
                type="password"
                value={formData.portal_password}
                onChange={(e) => handleInputChange('portal_password', e.target.value)}
                className="col-span-3"
                placeholder="Leave empty for no protection"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ghl_api_key" className="text-right">
                GHL API Key
              </Label>
              <Input
                id="ghl_api_key"
                type="password"
                value={formData.ghl_api_key}
                onChange={(e) => handleInputChange('ghl_api_key', e.target.value)}
                className="col-span-3"
                placeholder="Leave empty to remove key"
              />
            </div>
            <div className="col-span-4 text-sm text-muted-foreground">
              <p>Setting a password will require visitors to enter it before accessing the project portal.</p>
              <p>The GHL API Key will be used for updating appointment statuses via webhooks.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
