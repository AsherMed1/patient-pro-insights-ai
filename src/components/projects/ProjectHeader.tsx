
import React from 'react';
import { Building } from 'lucide-react';

interface ProjectHeaderProps {
  projectName: string;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ projectName }) => {
  return (
    <div className="portal-section text-center">
      <div className="flex items-center justify-center space-x-3 mb-4">
        <div className="p-3 bg-primary/10 rounded-full">
          <Building className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            {projectName}
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Medical Practice Portal & Analytics
          </p>
        </div>
      </div>
      <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
    </div>
  );
};
