
import { useSecureFormSubmission } from './useSecureFormSubmission';
import type { FormSlide, ProjectForm } from '../types';

interface UseFormSubmissionProps {
  projectForm: ProjectForm | null;
  formData: Record<string, any>;
  slides: FormSlide[];
}

// Backward compatibility wrapper that now uses enhanced security
export const useFormSubmission = ({ projectForm, formData, slides }: UseFormSubmissionProps) => {
  return useSecureFormSubmission({ projectForm, formData, slides });
};
