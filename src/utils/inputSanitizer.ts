
// Simplified input sanitization utilities
export const sanitizeInput = {
  text: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/[<>]/g, '')
      .substring(0, 1000);
  },

  email: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .toLowerCase()
      .substring(0, 254);
  },

  phone: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[^\d\+\-\(\)\s\.]/g, '')
      .substring(0, 20);
  },

  number: (input: any): number => {
    const num = parseFloat(input);
    return isNaN(num) ? 0 : num;
  },

  date: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.match(/^\d{4}-\d{2}-\d{2}$/) ? input : '';
  }
};

export const validateInput = {
  required: (value: any): boolean => {
    return value !== null && value !== undefined && value !== '';
  },

  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10 && cleanPhone.length <= 16;
  },

  password: (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    return { valid: errors.length === 0, errors };
  }
};

// Simplified rate limiter for client-side only
export const rateLimiter = {
  checkLimit: (key: string, maxAttempts: number, windowMs: number): boolean => {
    // Only run on client side
    if (typeof window === 'undefined') return true;
    
    try {
      const stored = sessionStorage.getItem(`rate_limit_${key}`);
      if (!stored) {
        sessionStorage.setItem(`rate_limit_${key}`, JSON.stringify({
          attempts: 1,
          timestamp: Date.now()
        }));
        return true;
      }

      const data = JSON.parse(stored);
      const now = Date.now();
      
      if (now - data.timestamp > windowMs) {
        sessionStorage.setItem(`rate_limit_${key}`, JSON.stringify({
          attempts: 1,
          timestamp: now
        }));
        return true;
      }

      if (data.attempts >= maxAttempts) {
        return false;
      }

      sessionStorage.setItem(`rate_limit_${key}`, JSON.stringify({
        attempts: data.attempts + 1,
        timestamp: data.timestamp
      }));
      
      return true;
    } catch (error) {
      console.error('Rate limiter error:', error);
      return true;
    }
  },

  clearAttempts: (key: string): void => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`rate_limit_${key}`);
      } catch (error) {
        console.error('Failed to clear rate limit:', error);
      }
    }
  }
};
