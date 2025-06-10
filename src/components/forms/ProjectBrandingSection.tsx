
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from 'lucide-react';
import ProjectBrandingCard from './ProjectBrandingCard';

interface Project {
  id: string;
  project_name: string;
  custom_logo_url?: string;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  custom_insurance_list?: any[];
  custom_doctors?: any[];
  custom_facility_info?: any;
}

interface ProjectBrandingSectionProps {
  projects: Project[];
  onEditBranding: (project: Project) => void;
}

const ProjectBrandingSection = ({ projects, onEditBranding }: ProjectBrandingSectionProps) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="w-5 h-5" />
          <span>Project Branding</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectBrandingCard
              key={project.id}
              project={project}
              onEditBranding={onEditBranding}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectBrandingSection;
