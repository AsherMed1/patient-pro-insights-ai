
// Input sanitization utilities for enhanced security
export const sanitizeInput = {
  text: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  },

  email: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .toLowerCase()
      .substring(0, 254); // RFC limit for email length
  },

  phone: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[^\d\+\-\(\)\s\.]/g, '') // Only allow digits and common phone chars
      .substring(0, 20);
  },

  number: (input: any): number => {
    const num = parseFloat(input);
    return isNaN(num) ? 0 : num;
  },

  date: (input: string): string => {
    if (typeof input !== 'string') return '';
    // Basic date format validation
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
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return { valid: errors.length === 0, errors };
  }
};

export const rateLimiter = {
  checkLimit: (key: string, maxAttempts: number, windowMs: number): boolean => {
    try {
      const stored = localStorage.getItem(`rate_limit_${key}`);
      if (!stored) {
        localStorage.setItem(`rate_limit_${key}`, JSON.stringify({
          attempts: 1,
          timestamp: Date.now()
        }));
        return true;
      }

      const data = JSON.parse(stored);
      const now = Date.now();
      
      if (now - data.timestamp > windowMs) {
        // Reset window
        localStorage.setItem(`rate_limit_${key}`, JSON.stringify({
          attempts: 1,
          timestamp: now
        }));
        return true;
      }

      if (data.attempts >= maxAttempts) {
        return false;
      }

      // Increment attempts
      localStorage.setItem(`rate_limit_${key}`, JSON.stringify({
        attempts: data.attempts + 1,
        timestamp: data.timestamp
      }));
      
      return true;
    } catch (error) {
      console.error('Rate limiter error:', error);
      return true; // Fail open
    }
  },

  clearAttempts: (key: string): void => {
    try {
      localStorage.removeItem(`rate_limit_${key}`);
    } catch (error) {
      console.error('Failed to clear rate limit:', error);
    }
  }
};
