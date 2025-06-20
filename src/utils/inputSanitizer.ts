
// Input sanitization utilities for security

export const sanitizeInput = {
  // Basic text sanitization
  text: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .substring(0, 1000); // Limit length
  },

  // Email sanitization
  email: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.trim().toLowerCase().substring(0, 254);
  },

  // Phone number sanitization
  phone: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.replace(/[^\d\+\-\(\)\s]/g, '').substring(0, 20);
  },

  // Number sanitization
  number: (input: any): number => {
    const num = parseFloat(input);
    return isNaN(num) ? 0 : num;
  },

  // Date sanitization
  date: (input: string): string => {
    if (typeof input !== 'string') return '';
    const date = new Date(input);
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
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
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
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
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

export const rateLimiter = {
  attempts: new Map<string, { count: number; resetTime: number }>(),

  checkLimit: function(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (attempt.count >= maxAttempts) {
      return false;
    }

    attempt.count++;
    return true;
  },

  clearAttempts: function(key: string): void {
    this.attempts.delete(key);
  }
};
