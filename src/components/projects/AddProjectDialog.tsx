
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectForm } from './ProjectForm';
import { ProjectFormData } from './types';

interface AddProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectFormData) => void;
}

export const AddProjectDialog = ({ isOpen, onClose, onSave }: AddProjectDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your data and forms.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm onSave={onSave} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
};
