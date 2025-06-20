
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectForm } from './ProjectForm';
import { Project, ProjectFormData } from './types';

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: () => (data: ProjectFormData) => Promise<void>;
}

export const EditProjectDialog = ({ project, open, onOpenChange, onProjectUpdated }: EditProjectDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project details and configuration settings.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm 
          initialData={project} 
          onSubmit={onProjectUpdated()} 
        />
      </DialogContent>
    </Dialog>
  );
};
