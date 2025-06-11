
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FormTemplate } from './types';

interface Project {
  id: string;
  project_name: string;
}

interface AddFormTemplateToProjectProps {
  projects: Project[];
  onFormAdded: () => void;
}

const AddFormTemplateToProject = ({ projects, onFormAdded }: AddFormTemplateToProjectProps) => {
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [urlSlug, setUrlSlug] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFormTemplates();
  }, []);

  const fetchFormTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .order('title');

      if (error) throw error;
      setFormTemplates(data || []);
    } catch (error) {
      console.error('Error fetching form templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch form templates",
        variant: "destructive",
      });
    }
  };

  const generateSlug = (projectName: string, templateTitle: string) => {
    const slug = `${projectName}-${templateTitle}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    return slug;
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    if (selectedTemplate) {
      const project = projects.find(p => p.id === projectId);
      const template = formTemplates.find(t => t.id === selectedTemplate);
      if (project && template) {
        setUrlSlug(generateSlug(project.project_name, template.title));
      }
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (selectedProject) {
      const project = projects.find(p => p.id === selectedProject);
      const template = formTemplates.find(t => t.id === templateId);
      if (project && template) {
        setUrlSlug(generateSlug(project.project_name, template.title));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject || !selectedTemplate || !urlSlug) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if URL slug already exists
      const { data: existingForm } = await supabase
        .from('project_forms')
        .select('id')
        .eq('public_url_slug', urlSlug)
        .single();

      if (existingForm) {
        toast({
          title: "Error",
          description: "A form with this URL already exists",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('project_forms')
        .insert({
          project_id: selectedProject,
          form_template_id: selectedTemplate,
          public_url_slug: urlSlug,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form template added to project successfully",
      });

      // Reset form
      setSelectedProject('');
      setSelectedTemplate('');
      setUrlSlug('');
      
      // Refresh the forms list
      onFormAdded();
    } catch (error) {
      console.error('Error adding form template to project:', error);
      toast({
        title: "Error",
        description: "Failed to add form template to project",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>Add Form Template to Project</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Form Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a form template" />
                </SelectTrigger>
                <SelectContent>
                  {formTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title} ({template.form_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urlSlug">Public URL Slug</Label>
            <Input
              id="urlSlug"
              value={urlSlug}
              onChange={(e) => setUrlSlug(e.target.value)}
              placeholder="form-url-slug"
              required
            />
            <p className="text-sm text-muted-foreground">
              This will be the public URL: /form/{urlSlug}
            </p>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Form Template'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddFormTemplateToProject;
