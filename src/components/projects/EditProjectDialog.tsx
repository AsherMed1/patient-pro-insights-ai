
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm } from './ProjectForm';
import { Project, ProjectFormData } from './types';

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: (data: ProjectFormData) => void;
}

export const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  project,
  open,
  onOpenChange,
  onProjectUpdated,
}) => {
  const handleSubmit = (data: ProjectFormData) => {
    onProjectUpdated(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the project details and configuration settings.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm project={project} onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
};
