
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
  const [errors, setErrors] = useState<Partial<Record<keyof T | '_form', string>>>({});
  const [touched, setTouchedFields] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);

  const validateField = useCallback((name: keyof T, value: any): string => {
    const rule = config[name as string];
    if (!rule) return '';

    // Required validation
    if (rule.required && !validateInput.required(value)) {
      return `${String(name)} is required`;
    }

    if (!value) return ''; // Don't validate empty optional fields

    // Type-specific validation with enhanced security
    switch (rule.type) {
      case 'email':
        if (!validateInput.email(value)) {
          return 'Please enter a valid email address';
        }
        // Additional email security check
        if (value.length > 254) {
          return 'Email address is too long';
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
        // Check for common weak passwords
        const weakPasswords = ['password', '123456', 'qwerty', 'admin'];
        if (weakPasswords.includes(value.toLowerCase())) {
          return 'Password is too common. Please choose a stronger password.';
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
    // Enhanced input sanitization based on type
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
          // Additional length restriction for security
          if (sanitizedValue.length > 1000) {
            sanitizedValue = sanitizedValue.substring(0, 1000);
          }
          break;
        case 'number':
          sanitizedValue = sanitizeInput.number(value);
          break;
        case 'date':
          sanitizedValue = sanitizeInput.date(value);
          break;
        case 'password':
          // Don't sanitize passwords, but validate length
          if (typeof value === 'string' && value.length > 128) {
            sanitizedValue = value.substring(0, 128);
          }
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
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    
    // Validate field when touched
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField, values]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T | '_form', string>> = {};
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
    options?: { skipRateLimit?: boolean; maxAttempts?: number }
  ) => {
    if (isSubmitting) return false;

    const maxAttempts = options?.maxAttempts || 5;
    
    // Check for too many attempts
    if (submitAttempts >= maxAttempts) {
      setErrors(prev => ({ 
        ...prev, 
        _form: 'Too many submission attempts. Please refresh the page and try again.' 
      }));
      return false;
    }

    // Rate limiting check
    if (rateLimitKey && !options?.skipRateLimit) {
      if (!rateLimiter.checkLimit(rateLimitKey, 5, 15 * 60 * 1000)) {
        setErrors(prev => ({ 
          ...prev, 
          _form: 'Too many attempts. Please try again later.' 
        }));
        return false;
      }
    }

    setIsSubmitting(true);
    setSubmitAttempts(prev => prev + 1);
    
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
      
      // Reset attempts on success
      setSubmitAttempts(0);
      
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors(prev => ({ 
        ...prev, 
        _form: error instanceof Error ? error.message : 'An error occurred. Please try again.' 
      }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, rateLimitKey, validateForm, values, submitAttempts]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouchedFields({});
    setIsSubmitting(false);
    setSubmitAttempts(0);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitAttempts,
    setValue,
    setTouched,
    handleSubmit,
    validateForm,
    reset
  };
};
