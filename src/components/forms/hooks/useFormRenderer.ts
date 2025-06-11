
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FormTemplate, ProjectForm } from '../types';
import { useFormData } from './useFormData';
import { useFormNavigation } from './useFormNavigation';
import { useFormSubmission } from './useFormSubmission';

export const useFormRenderer = (slug: string) => {
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm | null>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const {
    formData,
    showFollowUp,
    handleInputChange,
    updateFollowUpVisibility
  } = useFormData();

  const fetchFormData = async () => {
    try {
      setLoading(true);

      const { data: projectFormData, error: projectFormError } = await supabase
        .from('project_forms')
        .select(`
          *,
          form_templates (*),
          projects (*)
        `)
        .eq('public_url_slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (projectFormError) {
        console.error('Error fetching project form:', projectFormError);
        return;
      }

      if (!projectFormData) {
        console.log('No active form found for slug:', slug);
        return;
      }

      // Transform the data to match our types
      const transformedProjectForm: ProjectForm = {
        ...projectFormData,
        form_templates: projectFormData.form_templates ? {
          ...projectFormData.form_templates,
          form_data: projectFormData.form_templates.form_data as { slides: any[] }
        } : undefined,
        projects: projectFormData.projects ? {
          ...projectFormData.projects,
          custom_insurance_list: projectFormData.projects.custom_insurance_list as any[],
          custom_doctors: projectFormData.projects.custom_doctors as any[],
          custom_facility_info: projectFormData.projects.custom_facility_info as any
        } : undefined
      };

      setProjectForm(transformedProjectForm);
      setProject(projectFormData.projects);
      
      if (projectFormData.form_templates) {
        const transformedFormTemplate: FormTemplate = {
          ...projectFormData.form_templates,
          form_data: projectFormData.form_templates.form_data as { slides: any[] }
        };
        setFormTemplate(transformedFormTemplate);
      }

    } catch (error) {
      console.error('Error in fetchFormData:', error);
      toast({
        title: "Error",
        description: "Failed to load form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const slides = formTemplate?.form_data?.slides || [];
  const totalSteps = formTemplate?.total_steps || 0;

  const {
    currentSlide,
    handleNext,
    handlePrevious
  } = useFormNavigation({
    totalSteps,
    slides,
    formData,
    updateFollowUpVisibility
  });

  const { handleSubmit } = useFormSubmission({
    projectForm,
    formData,
    slides
  });

  useEffect(() => {
    if (slug) {
      fetchFormData();
    }
  }, [slug]);

  return {
    formTemplate,
    projectForm,
    project,
    currentSlide,
    formData,
    showFollowUp,
    loading,
    handleInputChange,
    handleNext,
    handlePrevious,
    handleSubmit
  };
};
