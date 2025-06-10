
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, Settings2, Copy, ExternalLink, Palette } from 'lucide-react';
import ProjectBrandingEditor from './ProjectBrandingEditor';
import type { ProjectForm } from './types';

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
  const [projectForms, setProjectForms] = useState<ProjectForm[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [brandingEditorOpen, setBrandingEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjectForms();
    fetchProjects();
  }, [projectId]);

  const fetchProjectForms = async () => {
    try {
      let query = supabase
        .from('project_forms')
        .select(`
          *,
          form_templates (*),
          projects (
            id,
            project_name,
            custom_logo_url,
            brand_primary_color,
            brand_secondary_color,
            custom_insurance_list,
            custom_doctors,
            custom_facility_info
          )
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our types
      const transformedData = (data || []).map(item => ({
        ...item,
        form_templates: {
          ...item.form_templates,
          form_data: item.form_templates?.form_data as unknown as { slides: any[] }
        }
      })) as ProjectForm[];

      setProjectForms(transformedData);
    } catch (error) {
      console.error('Error fetching project forms:', error);
      toast({
        title: "Error",
        description: "Failed to fetch forms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .order('project_name');

      if (projectId) {
        query = query.eq('id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our types
      const transformedData = (data || []).map(project => ({
        ...project,
        custom_insurance_list: Array.isArray(project.custom_insurance_list) 
          ? project.custom_insurance_list 
          : [],
        custom_doctors: Array.isArray(project.custom_doctors) 
          ? project.custom_doctors 
          : [],
        custom_facility_info: typeof project.custom_facility_info === 'object' 
          ? project.custom_facility_info 
          : {}
      })) as Project[];

      setProjects(transformedData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  const openBrandingEditor = (project: Project) => {
    setSelectedProject(project);
    setBrandingEditorOpen(true);
  };

  const handleBrandingSaved = () => {
    fetchProjectForms();
    fetchProjects();
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

      {/* Project Branding Section */}
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
              <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{project.project_name}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openBrandingEditor(project)}
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
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectForms.map((projectForm) => (
          <Card key={projectForm.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {projectForm.form_templates?.title}
                </CardTitle>
                <Badge variant={projectForm.is_active ? "default" : "secondary"}>
                  {projectForm.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {projectForm.projects?.project_name}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {projectForm.form_templates?.description}
              </p>
              
              <div className="text-xs text-muted-foreground">
                Form Type: {projectForm.form_templates?.form_type}
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`${window.location.origin}/form/${projectForm.public_url_slug}`)}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/form/${projectForm.public_url_slug}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground break-all">
                  /form/{projectForm.public_url_slug}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projectForms.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No forms found</div>
          <p className="text-sm text-muted-foreground mt-2">
            Create forms by assigning form templates to your projects
          </p>
        </div>
      )}

      {/* Project Branding Editor */}
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
