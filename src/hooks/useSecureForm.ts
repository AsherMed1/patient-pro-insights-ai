
import { useState, useCallback } from 'react';
import { EnhancedSecurityValidator, ValidationResult } from '@/utils/securityEnhancedValidator';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';
import { useCSRFProtection } from './useCSRFProtection';

interface FormField {
  value: string;
  error?: string;
  touched: boolean;
}

interface UseSecureFormOptions {
  formType: string;
  requireCSRF?: boolean;
  rateLimitKey?: string;
}

export const useSecureForm = (options: UseSecureFormOptions) => {
  const { csrfToken, getCSRFHeaders } = useCSRFProtection();
  const [fields, setFields] = useState<Record<string, FormField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: string, value: string, type: 'email' | 'password' | 'text' | 'phone' | 'name') => {
    const result = EnhancedSecurityValidator.validateAndSanitize(value, type);
    
    setFields(prev => ({
      ...prev,
      [name]: {
        value: result.sanitizedValue || value,
        error: result.isValid ? undefined : result.error,
        touched: true
      }
    }));

    if (!result.isValid) {
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'form_submission',
        severity: 'LOW',
        details: {
          formType: options.formType,
          fieldName: name,
          validationError: result.error
        }
      });
    }

    return result;
  }, [options.formType]);

  const updateField = useCallback((name: string, value: string) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        value,
        touched: true
      }
    }));
  }, []);

  const getFieldProps = useCallback((name: string) => ({
    value: fields[name]?.value || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateField(name, e.target.value),
    error: fields[name]?.error,
    touched: fields[name]?.touched || false
  }), [fields, updateField]);

  const validateForm = useCallback(() => {
    const errors: string[] = [];
    Object.entries(fields).forEach(([name, field]) => {
      if (field.error) {
        errors.push(`${name}: ${field.error}`);
      }
    });
    return errors;
  }, [fields]);

  const getSecureHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.requireCSRF) {
      Object.assign(headers, getCSRFHeaders());
    }

    return headers;
  }, [options.requireCSRF, getCSRFHeaders]);

  const submitForm = useCallback(async (submitFn: () => Promise<void>) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const validationErrors = validateForm();
    
    try {
      if (validationErrors.length > 0) {
        throw new Error('Form validation failed');
      }

      // Rate limiting check if specified
      if (options.rateLimitKey) {
        const clientId = `form_${Date.now()}`;
        if (EnhancedSecurityValidator.isRateLimited(clientId, 5, 60000)) {
          throw new Error('Too many attempts. Please wait before trying again.');
        }
      }

      await submitFn();

      EnhancedSecurityLogger.logFormSubmission(options.formType, true);
    } catch (error) {
      EnhancedSecurityLogger.logFormSubmission(
        options.formType, 
        false, 
        validationErrors.length > 0 ? validationErrors : [(error as Error).message]
      );
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateForm, options.formType, options.rateLimitKey]);

  return {
    fields,
    validateField,
    updateField,
    getFieldProps,
    validateForm,
    getSecureHeaders,
    submitForm,
    isSubmitting,
    csrfToken
  };
};
