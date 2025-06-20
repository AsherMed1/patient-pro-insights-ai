
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FormSlide, ProjectForm } from '../types';
import { processFormTags, generateQualificationTags } from '../utils/tagProcessor';
import { generateAISummary } from '../utils/aiSummaryGenerator';

interface UseSecureFormSubmissionProps {
  projectForm: ProjectForm | null;
  formData: Record<string, any>;
  slides: FormSlide[];
}

export const useSecureFormSubmission = ({ projectForm, formData, slides }: UseSecureFormSubmissionProps) => {
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!projectForm) {
      toast({
        title: "Error",
        description: "Form configuration not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const formTags = processFormTags(formData, slides);
      const qualificationTags = generateQualificationTags(formTags);
      const allTags = [...formTags, ...qualificationTags];

      const aiSummary = generateAISummary(
        formData,
        slides,
        projectForm.form_templates?.form_type || ''
      );

      const contactInfo = {
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        email: formData.email || formData.final_email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        zip_code: formData.zip_code || '',
        insurance_provider: formData.insurance_provider || ''
      };

      const { error } = await supabase
        .from('form_submissions')
        .insert({
          project_form_id: projectForm.id,
          submission_data: formData,
          tags: allTags,
          ai_summary: aiSummary,
          contact_info: contactInfo
        });

      if (error) {
        console.error('Submission error:', error);
        toast({
          title: "Error",
          description: "Failed to submit form. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Assessment submitted successfully!",
      });

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    }
  };

  return { handleSubmit };
};
