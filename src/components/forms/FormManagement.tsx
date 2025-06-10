
import React, { useState } from 'react';
import { useFormManagement } from './hooks/useFormManagement';
import ProjectBrandingSection from './ProjectBrandingSection';
import FormsGrid from './FormsGrid';
import ProjectBrandingEditor from './ProjectBrandingEditor';

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

interface FormManagementProps {
  projectId?: string;
}

const FormManagement = ({ projectId }: FormManagementProps) => {
  const { projectForms, projects, loading, copyToClipboard, refreshData } = useFormManagement(projectId);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [brandingEditorOpen, setBrandingEditorOpen] = useState(false);

  const openBrandingEditor = (project: Project) => {
    setSelectedProject(project);
    setBrandingEditorOpen(true);
  };

  const handleBrandingSaved = () => {
    refreshData();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading forms...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Form Management</h1>
          <p className="text-muted-foreground">Manage your project forms and branding</p>
        </div>
      </div>

      <ProjectBrandingSection 
        projects={projects} 
        onEditBranding={openBrandingEditor} 
      />

      <FormsGrid 
        projectForms={projectForms} 
        onCopyUrl={copyToClipboard} 
      />

      {selectedProject && (
        <ProjectBrandingEditor
          project={selectedProject}
          isOpen={brandingEditorOpen}
          onClose={() => setBrandingEditorOpen(false)}
          onSave={handleBrandingSaved}
        />
      )}
    </div>
  );
};

export default FormManagement;
