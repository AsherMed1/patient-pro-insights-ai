
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

// Simple validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10 && cleanPhone.length <= 16;
};

const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

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
      console.log('Form submission started for project:', projectForm.id);

      // Basic validation for form data
      const formDataString = JSON.stringify(formData);
      if (formDataString.length > 50000) {
        toast({
          title: "Error",
          description: "Form data is too large",
          variant: "destructive",
        });
        return;
      }

      // Validate required contact information
      if (formData.email && !validateEmail(formData.email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }

      if (formData.phone && !validatePhone(formData.phone)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid phone number",
          variant: "destructive",
        });
        return;
      }

      // Simple rate limiting check
      const rateLimitKey = `form_${projectForm.id}`;
      const lastSubmission = localStorage.getItem(rateLimitKey);
      if (lastSubmission) {
        const timeSince = Date.now() - parseInt(lastSubmission);
        if (timeSince < 5 * 60 * 1000) { // 5 minutes
          toast({
            title: "Rate Limited",
            description: "Please wait before submitting again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Sanitize all string inputs
      const sanitizedFormData = Object.keys(formData).reduce((acc, key) => {
        const value = formData[key];
        if (typeof value === 'string') {
          acc[key] = sanitizeString(value);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      console.log('Form data sanitized successfully');

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
        first_name: sanitizeString(sanitizedFormData.first_name || ''),
        last_name: sanitizeString(sanitizedFormData.last_name || ''),
        email: sanitizedFormData.email || sanitizedFormData.final_email,
        phone: sanitizedFormData.phone,
        date_of_birth: sanitizedFormData.date_of_birth,
        zip_code: sanitizeString(sanitizedFormData.zip_code || ''),
        insurance_provider: sanitizeString(sanitizedFormData.insurance_provider || '')
      };

      console.log('Submitting form data to database...');

      // Submit to database
      const { error } = await supabase
        .from('form_submissions')
        .insert({
          project_form_id: projectForm.id,
          submission_data: sanitizedFormData,
          tags: allTags,
          ai_summary: sanitizeString(aiSummary),
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

      // Store rate limit timestamp
      localStorage.setItem(rateLimitKey, Date.now().toString());

      console.log('Form submitted successfully');

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
