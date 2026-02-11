import React from 'react';
import { Building } from 'lucide-react';

interface ProjectHeaderProps {
  projectName: string;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ projectName }) => {
  return (
    <div className="section-card text-center animate-fade-in-up">
      <div className="flex items-center justify-center gap-4 mb-5">
        <div className="p-4 bg-primary/10 rounded-2xl shadow-soft-sm">
          <Building className="h-10 w-10 text-primary" />
        </div>
        <div className="text-left">
          <h1 className="heading-1">
            {projectName}
          </h1>
          <p className="body-base mt-1.5">
            Medical Practice Portal & Analytics
          </p>
        </div>
      </div>
      <div className="w-full h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    </div>
  );
};
