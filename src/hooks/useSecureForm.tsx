
import { useState, useCallback } from 'react';
import { EnhancedSecurityValidator } from '@/utils/securityEnhancedValidator';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';

interface SecureFormConfig {
  formType: string;
  requireCSRF?: boolean;
  rateLimitKey?: string;
}

interface FieldState {
  value: string;
  error?: string;
  isValid: boolean;
}

interface SecureFormState {
  fields: Record<string, FieldState>;
  isSubmitting: boolean;
  csrfToken?: string;
}

export const useSecureForm = (config: SecureFormConfig) => {
  const [formState, setFormState] = useState<SecureFormState>({
    fields: {},
    isSubmitting: false,
    csrfToken: config.requireCSRF ? EnhancedSecurityValidator.generateCSRFToken() : undefined
  });

  const updateField = useCallback((fieldName: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: {
          value,
          error: undefined,
          isValid: true
        }
      }
    }));
  }, []);

  const validateField = useCallback((
    fieldName: string, 
    value: string, 
    type: 'email' | 'password' | 'text' | 'phone' | 'name'
  ) => {
    const validation = EnhancedSecurityValidator.validateAndSanitize(value, type);
    
    setFormState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: {
          value,
          error: validation.error,
          isValid: validation.isValid
        }
      }
    }));

    return validation;
  }, []);

  const submitForm = useCallback(async (submitCallback: () => Promise<void>) => {
    if (config.rateLimitKey) {
      const isRateLimited = EnhancedSecurityValidator.isRateLimited(config.rateLimitKey);
      if (isRateLimited) {
        throw new Error('Too many attempts. Please try again later.');
      }
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      await submitCallback();
      
      EnhancedSecurityLogger.logFormSubmission(config.formType, true);
    } catch (error) {
      EnhancedSecurityLogger.logFormSubmission(
        config.formType, 
        false, 
        [error instanceof Error ? error.message : 'Unknown error']
      );
      throw error;
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [config.formType, config.rateLimitKey]);

  const getFieldProps = useCallback((fieldName: string) => {
    const field = formState.fields[fieldName] || { value: '', error: undefined, isValid: true };
    
    return {
      value: field.value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateField(fieldName, e.target.value),
      error: field.error,
      isValid: field.isValid
    };
  }, [formState.fields, updateField]);

  return {
    fields: formState.fields,
    isSubmitting: formState.isSubmitting,
    csrfToken: formState.csrfToken,
    updateField,
    validateField,
    submitForm,
    getFieldProps
  };
};
