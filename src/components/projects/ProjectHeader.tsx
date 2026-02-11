import React from 'react';
import { Building } from 'lucide-react';

interface ProjectHeaderProps {
  projectName: string;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ projectName }) => {
  return (
    <div className="flex items-center gap-3 py-2 animate-fade-in-up">
      <div className="p-2.5 bg-primary/10 rounded-xl">
        <Building className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {projectName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Medical Practice Portal & Analytics
        </p>
      </div>
    </div>
  );
};
