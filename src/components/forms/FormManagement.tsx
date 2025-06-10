import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, ExternalLink, FileText, Users, Edit3, Palette } from 'lucide-react';
import FormEditor from './FormEditor';
import type { FormTemplate, ProjectForm, FormSubmission } from './types';

interface FormManagementProps {
  projectId: string;
}

const FormManagement = ({ projectId }: FormManagementProps) => {
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [projectForms, setProjectForms] = useState<ProjectForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<ProjectForm | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch available form templates
      const { data: templates, error: templatesError } = await supabase
        .from('form_templates')
        .select('*')
        .neq('form_type', 'insurance_reference'); // Exclude the insurance reference template
      
      if (templatesError) throw templatesError;
      
      // Type cast the form_data to our expected structure
      const typedTemplates = (templates || []).map(template => ({
        ...template,
        form_data: template.form_data as { slides: any[] }
      })) as FormTemplate[];
      
      setFormTemplates(typedTemplates);

      // Fetch project forms with all customization fields
      const { data: forms, error: formsError } = await supabase
        .from('project_forms')
        .select(`
          *,
          form_templates (*)
        `)
        .eq('project_id', projectId);
      
      if (formsError) throw formsError;
      
      // Type cast the nested form_templates data
      const typedForms = (forms || []).map(form => ({
        ...form,
        form_templates: form.form_templates ? {
          ...form.form_templates,
          form_data: form.form_templates.form_data as { slides: any[] }
        } : undefined
      })) as ProjectForm[];
      
      setProjectForms(typedForms);

      // Fetch submissions for project forms
      if (forms && forms.length > 0) {
        const formIds = forms.map(f => f.id);
        const { data: submissionData, error: submissionsError } = await supabase
          .from('form_submissions')
          .select('*')
          .in('project_form_id', formIds)
          .order('submitted_at', { ascending: false });
        
        if (submissionsError) throw submissionsError;
        
        // Type cast the submission data
        const typedSubmissions = (submissionData || []).map(submission => ({
          ...submission,
          submission_data: submission.submission_data as Record<string, any>,
          contact_info: submission.contact_info as Record<string, any>,
          tags: Array.isArray(submission.tags) ? submission.tags : []
        })) as FormSubmission[];
        
        setSubmissions(typedSubmissions);
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProjectForm = async (templateId: string) => {
    try {
      const template = formTemplates.find(t => t.id === templateId);
      if (!template) return;

      // Generate a unique slug
      const slug = `${template.form_type}-${Date.now()}`;

      const { error } = await supabase
        .from('project_forms')
        .insert({
          project_id: projectId,
          form_template_id: templateId,
          public_url_slug: slug,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form created successfully!",
      });

      await fetchData();
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        title: "Error",
        description: "Failed to create form",
        variant: "destructive",
      });
    }
  };

  const toggleFormStatus = async (formId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('project_forms')
        .update({ is_active: !isActive })
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Form ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });

      await fetchData();
    } catch (error) {
      console.error('Error updating form status:', error);
      toast({
        title: "Error",
        description: "Failed to update form status",
        variant: "destructive",
      });
    }
  };

  const copyPublicUrl = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Form URL copied to clipboard",
    });
  };

  const openForm = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    window.open(url, '_blank');
  };

  const openEditor = (form: ProjectForm) => {
    setSelectedForm(form);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setSelectedForm(null);
  };

  const handleEditorSave = () => {
    fetchData(); // Refresh data after save
  };

  const hasCustomizations = (form: ProjectForm) => {
    return form.custom_logo_url || 
           (form.custom_insurance_list && (form.custom_insurance_list as any[]).length > 0) ||
           (form.custom_doctors && (form.custom_doctors as any[]).length > 0) ||
           (form.custom_facility_info && Object.keys(form.custom_facility_info as any).length > 0);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <span>Loading forms...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Questionnaire Management</span>
          </CardTitle>
          <CardDescription>
            Create and manage public forms for lead capture and assessments. Customize branding, doctors, and insurance lists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active Forms</TabsTrigger>
              <TabsTrigger value="templates">Available Templates</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {projectForms.filter(f => f.is_active).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No active forms found.</p>
                  <p className="text-sm">Create a form from the templates tab.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {projectForms.filter(f => f.is_active).map((form) => (
                    <Card key={form.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{form.form_templates?.title}</h3>
                            {hasCustomizations(form) && (
                              <Badge variant="secondary" className="flex items-center space-x-1">
                                <Palette className="w-3 h-3" />
                                <span>Customized</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {form.form_templates?.description}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{form.form_templates?.total_steps} steps</span>
                            <span>•</span>
                            <span>{submissions.filter(s => s.project_form_id === form.id).length} submissions</span>
                            {form.custom_logo_url && (
                              <>
                                <span>•</span>
                                <span>Custom logo</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={form.is_active ? "default" : "secondary"}>
                            {form.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditor(form)}
                            className="flex items-center space-x-1"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Customize</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyPublicUrl(form.public_url_slug)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openForm(form.public_url_slug)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={form.is_active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => toggleFormStatus(form.id, form.is_active)}
                          >
                            {form.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono">
                        {`${window.location.origin}/form/${form.public_url_slug}`}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid gap-4">
                {formTemplates.map((template) => {
                  const hasForm = projectForms.some(f => f.form_template_id === template.id);
                  
                  return (
                    <Card key={template.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{template.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{template.total_steps} steps</span>
                            <span>•</span>
                            <span>Type: {template.form_type}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {hasForm && (
                            <Badge variant="secondary">Already Created</Badge>
                          )}
                          <Button
                            onClick={() => createProjectForm(template.id)}
                            disabled={hasForm}
                          >
                            {hasForm ? "Created" : "Create Form"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="submissions" className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5" />
                <span className="font-semibold">
                  {submissions.length} Total Submissions
                </span>
              </div>
              
              {submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No submissions yet.</p>
                  <p className="text-sm">Share your forms to start collecting responses.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => {
                    const form = projectForms.find(f => f.id === submission.project_form_id);
                    
                    return (
                      <Card key={submission.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="font-semibold">
                              {submission.contact_info?.first_name} {submission.contact_info?.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {form?.form_templates?.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-sm">{submission.contact_info?.email}</p>
                            <p className="text-sm">{submission.contact_info?.phone}</p>
                            <div className="flex flex-wrap gap-1">
                              {submission.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {submission.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{submission.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Form Editor Dialog */}
      {selectedForm && (
        <FormEditor
          projectForm={selectedForm}
          isOpen={showEditor}
          onClose={closeEditor}
          onSave={handleEditorSave}
        />
      )}
    </div>
  );
};

export default FormManagement;
