
import { useState, useCallback } from 'react';
import { sanitizeInput, validateInput, rateLimiter } from '@/utils/inputSanitizer';

interface ValidationRule {
  required?: boolean;
  type?: 'email' | 'phone' | 'password' | 'text' | 'number' | 'date';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

interface FormConfig {
  [key: string]: ValidationRule;
}

export const useSecureForm = <T extends Record<string, any>>(
  initialValues: T,
  config: FormConfig,
  rateLimitKey?: string
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: keyof T, value: any): string => {
    const rule = config[name as string];
    if (!rule) return '';

    // Required validation
    if (rule.required && !validateInput.required(value)) {
      return `${String(name)} is required`;
    }

    if (!value) return ''; // Don't validate empty optional fields

    // Type-specific validation
    switch (rule.type) {
      case 'email':
        if (!validateInput.email(value)) {
          return 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (!validateInput.phone(value)) {
          return 'Please enter a valid phone number';
        }
        break;
      case 'password':
        const passwordValidation = validateInput.password(value);
        if (!passwordValidation.valid) {
          return passwordValidation.errors[0];
        }
        break;
    }

    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      return `${String(name)} must be at least ${rule.minLength} characters`;
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return `${String(name)} must be no more than ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      return `${String(name)} format is invalid`;
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (typeof result === 'string') {
        return result;
      }
      if (!result) {
        return `${String(name)} is invalid`;
      }
    }

    return '';
  }, [config]);

  const setValue = useCallback((name: keyof T, value: any) => {
    // Sanitize input based on type
    let sanitizedValue = value;
    const rule = config[name as string];
    
    if (rule?.type) {
      switch (rule.type) {
        case 'email':
          sanitizedValue = sanitizeInput.email(value);
          break;
        case 'phone':
          sanitizedValue = sanitizeInput.phone(value);
          break;
        case 'text':
          sanitizedValue = sanitizeInput.text(value);
          break;
        case 'number':
          sanitizedValue = sanitizeInput.number(value);
          break;
        case 'date':
          sanitizedValue = sanitizeInput.date(value);
          break;
        default:
          sanitizedValue = sanitizeInput.text(value);
      }
    }

    setValues(prev => ({ ...prev, [name]: sanitizedValue }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [config, errors]);

  const setTouched = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate field when touched
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField, values]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(config).forEach(key => {
      const error = validateField(key as keyof T, values[key as keyof T]);
      if (error) {
        newErrors[key as keyof T] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [config, validateField, values]);

  const handleSubmit = useCallback(async (
    onSubmit: (values: T) => Promise<void> | void,
    options?: { skipRateLimit?: boolean }
  ) => {
    if (isSubmitting) return false;

    // Rate limiting check
    if (rateLimitKey && !options?.skipRateLimit) {
      if (!rateLimiter.checkLimit(rateLimitKey)) {
        setErrors(prev => ({ 
          ...prev, 
          _form: 'Too many attempts. Please try again later.' 
        }));
        return false;
      }
    }

    setIsSubmitting(true);
    
    try {
      const isValid = validateForm();
      if (!isValid) {
        return false;
      }

      await onSubmit(values);
      
      // Clear rate limit on success
      if (rateLimitKey) {
        rateLimiter.clearAttempts(rateLimitKey);
      }
      
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors(prev => ({ 
        ...prev, 
        _form: 'An error occurred. Please try again.' 
      }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, rateLimitKey, validateForm, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setTouched,
    handleSubmit,
    validateForm,
    reset
  };
};
