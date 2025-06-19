
// Enhanced security middleware for comprehensive protection
import { sanitizeInput, validateInput } from './inputSanitizer';

interface SecurityConfig {
  requireAuth?: boolean;
  rateLimitKey?: string;
  maxAttempts?: number;
  windowMs?: number;
  sanitizeBody?: boolean;
  allowedOrigins?: string[];
  csrfProtection?: boolean;
  validateInput?: boolean;
}

// Rate limiter with sliding window
class RateLimiter {
  private attempts: Map<string, Array<{ timestamp: number; count: number }>> = new Map();

  checkLimit(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Clean old attempts
    const validAttempts = attempts.filter(attempt => 
      now - attempt.timestamp < windowMs
    );
    
    // Calculate total attempts in window
    const totalAttempts = validAttempts.reduce((sum, attempt) => sum + attempt.count, 0);
    
    if (totalAttempts >= maxAttempts) {
      return false;
    }
    
    // Add new attempt
    validAttempts.push({ timestamp: now, count: 1 });
    this.attempts.set(key, validAttempts);
    
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

const rateLimiter = new RateLimiter();

export const enhancedSecurityMiddleware = {
  // Input validation rules
  validationRules: {
    email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    phone: (value: string) => /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s|-|\(|\)/g, '')),
    name: (value: string) => /^[a-zA-Z\s]{1,50}$/.test(value),
    projectName: (value: string) => /^[a-zA-Z0-9\s_-]{1,50}$/.test(value),
    password: (value: string) => value.length >= 6 && value.length <= 100,
    url: (value: string) => {
      try { new URL(value); return true; } catch { return false; }
    },
    color: (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value),
  },

  // Deep input sanitization
  sanitizeData: (data: any): any => {
    if (typeof data === 'string') {
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim()
        .substring(0, 1000); // Limit length
    }
    
    if (Array.isArray(data)) {
      return data.map(item => enhancedSecurityMiddleware.sanitizeData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const cleanKey = key.replace(/[<>'"&]/g, '').substring(0, 50);
        sanitized[cleanKey] = enhancedSecurityMiddleware.sanitizeData(value);
      }
      return sanitized;
    }
    
    return data;
  },

  // Comprehensive input validation
  validateData: (data: any, rules: Record<string, any>): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    for (const [field, value] of Object.entries(data)) {
      const rule = rules[field];
      if (!rule) continue;
      
      if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value && rule.type && !enhancedSecurityMiddleware.validationRules[rule.type]?.(value)) {
        errors.push(`${field} format is invalid`);
      }
      
      if (value && rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      
      if (value && rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must be no more than ${rule.maxLength} characters`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  },

  // Enhanced CSRF protection
  validateCSRF: (headers: Headers, allowedOrigins: string[] = []): boolean => {
    const origin = headers.get('origin');
    const referer = headers.get('referer');
    const userAgent = headers.get('user-agent');
    
    // Block requests without user agent (likely bots)
    if (!userAgent || userAgent.length < 10) {
      return false;
    }
    
    // Check allowed origins
    if (allowedOrigins.length > 0) {
      if (!origin || !allowedOrigins.some(allowed => origin.includes(allowed))) {
        return false;
      }
    }
    
    // Cross-origin checks
    if (origin && referer) {
      try {
        const originHost = new URL(origin).hostname;
        const refererHost = new URL(referer).hostname;
        return originHost === refererHost;
      } catch {
        return false;
      }
    }
    
    return true;
  },

  // Rate limiting with multiple strategies
  checkRateLimit: (identifier: string, action: string, config: any = {}): boolean => {
    const key = `${identifier}:${action}`;
    const maxAttempts = config.maxAttempts || 5;
    const windowMs = config.windowMs || 15 * 60 * 1000;
    
    return rateLimiter.checkLimit(key, maxAttempts, windowMs);
  },

  // Security headers
  getSecurityHeaders: (): Record<string, string> => ({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://bhabbokbhnqioykjimix.supabase.co wss://bhabbokbhnqioykjimix.supabase.co;",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'X-Permitted-Cross-Domain-Policies': 'none'
  }),

  // Get client IP (handles various proxy scenarios)
  getClientIP: (request: Request): string => {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = request.headers.get('x-client-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) return realIP;
    if (clientIP) return clientIP;
    
    return 'unknown';
  }
};

// Secure API hook for frontend
export const useSecureAPI = () => {
  const makeSecureRequest = async (
    url: string,
    options: RequestInit = {},
    config: SecurityConfig = {}
  ) => {
    const {
      requireAuth = false,
      rateLimitKey,
      maxAttempts = 5,
      windowMs = 15 * 60 * 1000,
      sanitizeBody = true,
      allowedOrigins = [],
      csrfProtection = true,
      validateInput = true
    } = config;

    // Rate limiting check
    if (rateLimitKey) {
      const clientId = `${window.location.hostname}-${Date.now()}`;
      if (!enhancedSecurityMiddleware.checkRateLimit(clientId, rateLimitKey, { maxAttempts, windowMs })) {
        throw new Error('Too many requests. Please try again later.');
      }
    }

    // Sanitize request body
    if (sanitizeBody && options.body) {
      try {
        const body = JSON.parse(options.body as string);
        const sanitizedBody = enhancedSecurityMiddleware.sanitizeData(body);
        options.body = JSON.stringify(sanitizedBody);
      } catch {
        // Body is not JSON, leave as is
      }
    }

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...enhancedSecurityMiddleware.getSecurityHeaders(),
      ...options.headers,
    };

    // Add auth header if required
    if (requireAuth) {
      try {
        const authData = sessionStorage.getItem('supabase.auth.token');
        if (authData) {
          const parsedAuth = JSON.parse(authData);
          headers['Authorization'] = `Bearer ${parsedAuth.access_token}`;
        } else {
          throw new Error('Authentication required but no token found');
        }
      } catch (error) {
        throw new Error('Authentication required');
      }
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return response;
  };

  return { makeSecureRequest };
};
