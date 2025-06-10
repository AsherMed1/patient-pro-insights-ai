
import React from 'react';
import { Button } from "@/components/ui/button";
import { Settings2 } from 'lucide-react';

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

interface ProjectBrandingCardProps {
  project: Project;
  onEditBranding: (project: Project) => void;
}

const ProjectBrandingCard = ({ project, onEditBranding }: ProjectBrandingCardProps) => {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{project.project_name}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEditBranding(project)}
          className="flex items-center space-x-1"
        >
          <Settings2 className="w-4 h-4" />
          <span>Edit Branding</span>
        </Button>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: project.brand_primary_color || '#3B82F6' }}
          ></div>
          <span>Primary: {project.brand_primary_color || '#3B82F6'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: project.brand_secondary_color || '#8B5CF6' }}
          ></div>
          <span>Secondary: {project.brand_secondary_color || '#8B5CF6'}</span>
        </div>
        {project.custom_logo_url && (
          <div>✓ Custom logo configured</div>
        )}
        <div>
          Insurance providers: {project.custom_insurance_list?.length || 0}
        </div>
        <div>
          Doctors: {project.custom_doctors?.length || 0}
        </div>
      </div>
    </div>
  );
};

export default ProjectBrandingCard;
