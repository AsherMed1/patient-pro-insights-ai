
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm } from './ProjectForm';
import type { Project } from './types';

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: () => void;
}

export const EditProjectDialog = ({
  project,
  open,
  onOpenChange,
  onProjectUpdated,
}: EditProjectDialogProps) => {
  const handleSuccess = () => {
    onProjectUpdated();
    onOpenChange(false);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the details for "{project.project_name}".
          </DialogDescription>
        </DialogHeader>
        <ProjectForm 
          initialData={project} 
          onSave={handleSuccess} 
          onCancel={() => onOpenChange(false)} 
        />
      </DialogContent>
    </Dialog>
  );
};
