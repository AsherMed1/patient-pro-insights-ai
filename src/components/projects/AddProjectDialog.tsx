
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import ProjectForm from './ProjectForm';
import { ProjectFormData } from './types';

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectAdded: (data: ProjectFormData) => void;
}

export const AddProjectDialog: React.FC<AddProjectDialogProps> = ({
  open,
  onOpenChange,
  onProjectAdded,
}) => {
  const handleSubmit = (data: ProjectFormData) => {
    onProjectAdded(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Project</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your leads, calls, and appointments.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
};
