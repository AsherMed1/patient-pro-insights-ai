
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Create a new project. Set a password to protect the project portal.
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
                placeholder="Enter project name"
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
                placeholder="Optional - for portal protection"
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
                placeholder="Optional - for webhook updates"
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
            <Button type="submit">Add Project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
