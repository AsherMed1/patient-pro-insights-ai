
import { useState, useEffect } from 'react';
import { EnhancedSecurityValidator } from '@/utils/securityEnhancedValidator';

export const useCSRFProtection = () => {
  const [csrfToken, setCSRFToken] = useState<string>('');

  useEffect(() => {
    // Generate CSRF token on component mount
    const token = EnhancedSecurityValidator.generateCSRFToken();
    setCSRFToken(token);
    
    // Store in session storage for validation
    sessionStorage.setItem('csrf_token', token);

    // Regenerate token periodically (every 30 minutes)
    const interval = setInterval(() => {
      const newToken = EnhancedSecurityValidator.generateCSRFToken();
      setCSRFToken(newToken);
      sessionStorage.setItem('csrf_token', newToken);
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const validateCSRFToken = (token: string): boolean => {
    const storedToken = sessionStorage.getItem('csrf_token');
    return token === storedToken && EnhancedSecurityValidator.validateCSRFToken(token);
  };

  const getCSRFHeaders = () => ({
    'X-CSRF-Token': csrfToken
  });

  return {
    csrfToken,
    validateCSRFToken,
    getCSRFHeaders
  };
};
