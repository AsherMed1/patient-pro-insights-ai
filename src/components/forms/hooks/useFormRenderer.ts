
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

  const generateAISummary = (data: Record<string, any>, template: FormTemplate) => {
    // Generate AI summary based on form responses for PFE survey
    if (template.form_type === 'pfe_screening') {
      const painDuration = data.pain_duration;
      const treatments = Array.isArray(data.treatment_history) ? data.treatment_history : [];
      const mainMotivators = Array.isArray(data.main_motivator) ? data.main_motivator : [];
      const activityLimitation = data.activity_limitation;
      const mobilityLimitation = data.mobility_limitation;

      let summary = `Based on your answers, you've had `;
      
      // Pain duration
      switch (painDuration) {
        case 'less_than_1_month':
          summary += 'heel pain for less than 1 month';
          break;
        case '1_to_3_months':
          summary += 'heel pain for 1-3 months';
          break;
        case '3_to_6_months':
          summary += 'chronic heel pain for 3-6 months';
          break;
        case 'more_than_6_months':
          summary += 'chronic heel pain for more than 6 months';
          break;
        default:
          summary += 'ongoing heel pain';
      }

      // Treatment history
      if (treatments.length > 0) {
        const treatmentLabels = treatments.map((t: string) => {
          switch (t) {
            case 'orthotics': return 'orthotics';
            case 'ice_therapy': return 'ice therapy';
            case 'otc_pain_meds': return 'over-the-counter pain medications';
            case 'cortisone_injections': return 'cortisone injections';
            case 'physical_therapy': return 'physical therapy';
            case 'night_splints': return 'night splints';
            default: return t;
          }
        });
        summary += `, have tried ${treatmentLabels.join(', ')}`;
      }

      // Impact on life
      const impacts = [];
      if (activityLimitation === 'often' || activityLimitation === 'always') {
        impacts.push('exercise and activity limitations');
      }
      if (mobilityLimitation === 'often' || mobilityLimitation === 'always') {
        impacts.push('difficulty with standing and walking');
      }
      if (mainMotivators.includes('missing_activities')) {
        impacts.push('missing out on activities');
      }
      if (mainMotivators.includes('work_exercise_impact')) {
        impacts.push('work and exercise limitations');
      }

      if (impacts.length > 0) {
        summary += `, and it's causing ${impacts.join(', ')}`;
      }

      summary += '. You may be a strong candidate for Plantar Fascia Embolization.';
      
      return summary;
    }

    return 'Thank you for completing the assessment. Our team will review your responses.';
  };

  const collectTags = (data: Record<string, any>, template: FormTemplate): string[] => {
    const tags: string[] = [];
    
    // Process each slide's responses for tags
    template.form_data.slides.forEach(slide => {
      if (slide.field_name && data[slide.field_name] && slide.options) {
        const fieldValue = data[slide.field_name];
        
        if (Array.isArray(fieldValue)) {
          // Multi-select field (checkbox)
          fieldValue.forEach(value => {
            const option = slide.options?.find(o => o.value === value);
            if (option?.tags) {
              tags.push(...option.tags);
            }
          });
        } else {
          // Single select field (radio)
          const option = slide.options?.find(o => o.value === fieldValue);
          if (option?.tags) {
            tags.push(...option.tags);
          }
        }
      }
    });

    // Add special logic tags for PFE survey
    if (template.form_type === 'pfe_screening') {
      // Failed conservative treatment if 3+ treatments tried
      const treatments = data.treatment_history;
      if (Array.isArray(treatments) && treatments.length >= 3) {
        tags.push('Failed_Conservative_Tx');
      }

      // Likely PFE candidate based on multiple factors
      const chronicPain = tags.includes('Chronic_Pain');
      const hasSymptoms = tags.includes('Classic_PF_Symptoms');
      const activityLimited = tags.includes('Activity_Limited') || tags.includes('Mobility_Limited');
      
      if (chronicPain && (hasSymptoms || activityLimited)) {
        tags.push('Likely_PFE_Candidate');
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  };

  const handleSubmit = async () => {
    try {
      if (!projectForm || !formTemplate) throw new Error('Project form not found');

      const contactInfo = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        zip_code: formData.zip_code
      };

      const tags = collectTags(formData, formTemplate);
      const aiSummary = generateAISummary(formData, formTemplate);

      const { error } = await supabase
        .from('form_submissions')
        .insert({
          project_form_id: projectForm.id,
          submission_data: formData,
          tags,
          ai_summary: aiSummary,
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
