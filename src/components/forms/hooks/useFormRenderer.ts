
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FormTemplate, ProjectForm } from '../types';

export const useFormRenderer = (slug: string) => {
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showFollowUp, setShowFollowUp] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFormTemplate();
  }, [slug]);

  const fetchFormTemplate = async () => {
    try {
      const { data: projectFormData, error } = await supabase
        .from('project_forms')
        .select(`
          *,
          form_templates (*)
        `)
        .eq('public_url_slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (!projectFormData?.form_templates) throw new Error('Form template not found');

      const typedProjectForm = {
        ...projectFormData,
        form_templates: {
          ...projectFormData.form_templates,
          form_data: projectFormData.form_templates.form_data as unknown as { slides: any[] }
        } as FormTemplate
      } as ProjectForm;

      const typedTemplate = typedProjectForm.form_templates;

      setProjectForm(typedProjectForm);
      setFormTemplate(typedTemplate);
    } catch (error) {
      console.error('Error fetching form template:', error);
      toast({
        title: "Error",
        description: "Form not found or unavailable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    const slide = formTemplate?.form_data.slides[currentSlide];
    if (slide?.conditional_follow_up) {
      const { condition, value: conditionValue, values } = slide.conditional_follow_up;
      let shouldShow = false;

      switch (condition) {
        case 'equals':
          shouldShow = value === conditionValue;
          break;
        case 'value_in':
          shouldShow = values?.includes(value) || false;
          break;
        case 'includes_any':
          shouldShow = Array.isArray(value) && values?.some(v => value.includes(v)) || false;
          break;
        case 'greater_than_equal':
          shouldShow = Number(value) >= Number(conditionValue);
          break;
      }

      setShowFollowUp(prev => ({
        ...prev,
        [currentSlide]: shouldShow
      }));
    }
  };

  const handleNext = () => {
    if (formTemplate && currentSlide < formTemplate.form_data.slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!projectForm) throw new Error('Project form not found');

      const contactInfo = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        zip_code: formData.zip_code
      };

      const tags: string[] = [];
      Object.entries(formData).forEach(([key, value]) => {
        const slide = formTemplate?.form_data.slides.find(s => s.field_name === key);
        if (slide?.options) {
          const selectedOptions = Array.isArray(value) ? value : [value];
          selectedOptions.forEach(selectedValue => {
            const option = slide.options?.find(o => o.value === selectedValue);
            if (option?.tags) {
              tags.push(...option.tags);
            }
          });
        }
      });

      const { error } = await supabase
        .from('form_submissions')
        .insert({
          project_form_id: projectForm.id,
          submission_data: formData,
          tags,
          contact_info: contactInfo
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your assessment has been submitted successfully!",
      });

      setFormData({});
      setCurrentSlide(0);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to submit assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    formTemplate,
    projectForm,
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
