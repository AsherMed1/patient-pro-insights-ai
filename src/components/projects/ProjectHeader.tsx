import React from 'react';
import { Building } from 'lucide-react';
interface ProjectHeaderProps {
  projectName: string;
}
export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  projectName
}) => {
  return <div className="text-center space-y-2">
      <div className="flex items-center justify-center space-x-2">
        
        <h1 className="text-4xl font-bold text-gray-900">{projectName}</h1>
      </div>
      <p className="text-xl text-gray-600">Project Portal & Analytics</p>
    </div>;
};