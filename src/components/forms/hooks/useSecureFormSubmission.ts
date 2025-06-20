
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SecurityValidator } from '@/utils/securityValidator';
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
      // Enhanced security validation for form data
      const formDataString = JSON.stringify(formData);
      const validation = SecurityValidator.validateInput(formDataString, 'text');
      if (!validation.isValid) {
        toast({
          title: "Security Error",
          description: validation.error || "Invalid form data detected",
          variant: "destructive",
        });
        return;
      }

      // Validate required contact information
      if (formData.email && !SecurityValidator.validateEmail(formData.email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }

      if (formData.phone && !SecurityValidator.validatePhone(formData.phone)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid phone number",
          variant: "destructive",
        });
        return;
      }

      // Rate limiting check
      const clientId = `form_${projectForm.id}_${Date.now()}`;
      if (!SecurityValidator.checkRateLimit(clientId, 5 * 60 * 1000, 3)) { // 3 submissions per 5 minutes
        toast({
          title: "Rate Limited",
          description: "Too many form submissions. Please wait before submitting again.",
          variant: "destructive",
        });
        return;
      }

      // Sanitize all string inputs
      const sanitizedFormData = Object.keys(formData).reduce((acc, key) => {
        const value = formData[key];
        if (typeof value === 'string') {
          acc[key] = SecurityValidator.sanitizeString(value);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      // Process tags with sanitization
      const formTags = processFormTags(sanitizedFormData, slides);
      const qualificationTags = generateQualificationTags(formTags);
      const allTags = [...formTags, ...qualificationTags];

      // Generate AI summary with sanitized data
      const aiSummary = generateAISummary(
        sanitizedFormData,
        slides,
        projectForm.form_templates?.form_type || ''
      );

      // Extract and sanitize contact info
      const contactInfo = {
        first_name: SecurityValidator.sanitizeString(sanitizedFormData.first_name || ''),
        last_name: SecurityValidator.sanitizeString(sanitizedFormData.last_name || ''),
        email: sanitizedFormData.email || sanitizedFormData.final_email,
        phone: sanitizedFormData.phone,
        date_of_birth: sanitizedFormData.date_of_birth,
        zip_code: SecurityValidator.sanitizeString(sanitizedFormData.zip_code || ''),
        insurance_provider: SecurityValidator.sanitizeString(sanitizedFormData.insurance_provider || '')
      };

      // Submit to database with enhanced error handling
      const { error } = await supabase
        .from('form_submissions')
        .insert({
          project_form_id: projectForm.id,
          submission_data: sanitizedFormData,
          tags: allTags,
          ai_summary: SecurityValidator.sanitizeString(aiSummary),
          contact_info: contactInfo
        });

      if (error) {
        console.error('Submission error:', error);
        
        // Log security event for failed submissions
        await supabase.rpc('log_security_event', {
          event_type_param: 'form_submission_error',
          details_param: {
            project_form_id: projectForm.id,
            error: error.message
          }
        });

        toast({
          title: "Error",
          description: "Failed to submit form. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Log successful submission
      await supabase.rpc('log_security_event', {
        event_type_param: 'form_submission_success',
        details_param: {
          project_form_id: projectForm.id,
          form_type: projectForm.form_templates?.form_type
        }
      });

      toast({
        title: "Success",
        description: "Assessment submitted successfully!",
      });

    } catch (error) {
      console.error('Submission error:', error);
      
      // Log unexpected errors
      await supabase.rpc('log_security_event', {
        event_type_param: 'form_submission_unexpected_error',
        details_param: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    }
  };

  return { handleSubmit };
};
