
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectForm } from './ProjectForm';
import { Project, ProjectFormData } from './types';

interface EditProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectFormData) => void;
  project: Project;
}

export const EditProjectDialog = ({ isOpen, onClose, onSave, project }: EditProjectDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the project details and configuration.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm 
          onSave={onSave} 
          onCancel={onClose} 
          initialData={project}
        />
      </DialogContent>
    </Dialog>
  );
};
