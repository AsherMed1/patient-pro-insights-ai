import React from 'react';
import { Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectHeaderProps {
  projectName: string;
  compact?: boolean;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ projectName, compact = false }) => {
  return (
    <div className={cn(
      "flex items-center animate-fade-in-up transition-all duration-300 ease-in-out",
      compact ? "gap-2 py-1" : "gap-3 py-2"
    )}>
      <div className={cn(
        "bg-primary/10 rounded-xl transition-all duration-300 ease-in-out",
        compact ? "p-1.5" : "p-2.5"
      )}>
        <Building className={cn(
          "text-primary transition-all duration-300 ease-in-out",
          compact ? "h-4 w-4" : "h-6 w-6"
        )} />
      </div>
      <div className="flex flex-col overflow-hidden">
        <h1 className={cn(
          "font-bold tracking-tight text-foreground transition-all duration-300 ease-in-out",
          compact ? "text-base" : "text-2xl"
        )}>
          {projectName}
        </h1>
        <p className={cn(
          "text-sm text-muted-foreground transition-all duration-300 ease-in-out",
          compact ? "opacity-0 max-h-0" : "opacity-100 max-h-6"
        )}>
          Medical Practice Portal & Analytics
        </p>
      </div>
    </div>
  );
};
