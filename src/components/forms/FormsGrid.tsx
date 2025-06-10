
import React from 'react';
import FormCard from './FormCard';
import type { ProjectForm } from './types';

interface FormsGridProps {
  projectForms: ProjectForm[];
  onCopyUrl: (url: string) => void;
}

const FormsGrid = ({ projectForms, onCopyUrl }: FormsGridProps) => {
  if (projectForms.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">No forms found</div>
        <p className="text-sm text-muted-foreground mt-2">
          Create forms by assigning form templates to your projects
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projectForms.map((projectForm) => (
        <FormCard
          key={projectForm.id}
          projectForm={projectForm}
          onCopyUrl={onCopyUrl}
        />
      ))}
    </div>
  );
};

export default FormsGrid;
