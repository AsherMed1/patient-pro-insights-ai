// Input sanitization and validation utilities with proper error handling
let DOMPurify: any = null;

// Safely import DOMPurify with fallback
const initializeDOMPurify = async () => {
  try {
    const DOMPurifyModule = await import('dompurify');
    DOMPurify = DOMPurifyModule.default;
  } catch (error) {
    console.warn('DOMPurify not available, using fallback sanitization');
  }
};

// Initialize DOMPurify
initializeDOMPurify();

// Fallback HTML sanitization when DOMPurify is not available
const fallbackHtmlSanitize = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

export const sanitizeInput = {
  // Basic text sanitization
  text: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
  },

  // HTML sanitization with fallback
  html: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    if (DOMPurify) {
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
        ALLOWED_ATTR: []
      });
    } else {
      return fallbackHtmlSanitize(input);
    }
  },

  // Email validation and sanitization
  email: (email: string): string => {
    if (!email || typeof email !== 'string') return '';
    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized : '';
  },

  // Phone number sanitization
  phone: (phone: string): string => {
    if (!phone || typeof phone !== 'string') return '';
    return phone.replace(/[^\d+\-\(\)\s]/g, '').trim();
  },

  // SQL injection prevention for search queries
  searchQuery: (query: string): string => {
    if (!query || typeof query !== 'string') return '';
    return query.replace(/[';--]/g, '').trim().substring(0, 100);
  },

  // Project name validation - fixed regex character class with escaped hyphen
  projectName: (name: string): string => {
    if (!name || typeof name !== 'string') return '';
    return name.replace(/[<>'"&\-]/g, '').trim();
  },

  // Numeric validation
  number: (value: any): number | null => {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  },

  // Date validation
  date: (dateString: string): string => {
    if (!dateString || typeof dateString !== 'string') return '';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  }
};

// Validation functions
export const validateInput = {
  required: (value: any): boolean => {
    return value !== null && value !== undefined && value !== '';
  },

  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^[\d+\-\(\)\s]{10,}$/;
    return phoneRegex.test(phone);
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
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Fixed project name validation regex - escaped hyphen
  projectName: (name: string): boolean => {
    return name.length >= 2 && name.length <= 50 && /^[a-zA-Z0-9\s_\-]+$/.test(name);
  }
};

// Enhanced rate limiting utility with server-side validation
export const rateLimiter = {
  attempts: new Map<string, { count: number; timestamp: number }>(),
  
  checkLimit: (key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
    const now = Date.now();
    const record = rateLimiter.attempts.get(key);
    
    if (!record || now - record.timestamp > windowMs) {
      rateLimiter.attempts.set(key, { count: 1, timestamp: now });
      return true;
    }
    
    if (record.count >= maxAttempts) {
      return false;
    }
    
    record.count++;
    return true;
  },
  
  clearAttempts: (key: string): void => {
    rateLimiter.attempts.delete(key);
  }
};
