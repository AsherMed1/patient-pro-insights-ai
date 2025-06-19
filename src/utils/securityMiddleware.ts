
// Enhanced security middleware for API endpoints and form submissions
import { sanitizeInput, validateInput, rateLimiter } from './inputSanitizer';

export interface SecurityConfig {
  requireAuth?: boolean;
  rateLimitKey?: string;
  maxAttempts?: number;
  windowMs?: number;
  sanitizeBody?: boolean;
  allowedOrigins?: string[];
  csrfProtection?: boolean;
}

export const securityMiddleware = {
  // Enhanced CSRF protection
  validateHeaders: (headers: Headers, allowedOrigins?: string[]): boolean => {
    const origin = headers.get('origin');
    const referer = headers.get('referer');
    
    // If allowed origins are specified, check against them
    if (allowedOrigins && allowedOrigins.length > 0) {
      if (origin && !allowedOrigins.includes(origin)) {
        return false;
      }
    }
    
    // Additional CSRF checks
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

  // Enhanced rate limiting with sliding window
  checkRateLimit: (key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
    return rateLimiter.checkLimit(key, maxAttempts, windowMs);
  },

  // Deep sanitization of request body
  sanitizeBody: (body: any): any => {
    if (!body || typeof body !== 'object') return body;

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(body)) {
      // Sanitize key names
      const cleanKey = key.replace(/[<>'"&]/g, '');
      
      if (typeof value === 'string') {
        sanitized[cleanKey] = sanitizeInput.text(value);
      } else if (Array.isArray(value)) {
        sanitized[cleanKey] = value.map(item => 
          typeof item === 'string' ? sanitizeInput.text(item) : 
          typeof item === 'object' ? securityMiddleware.sanitizeBody(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[cleanKey] = securityMiddleware.sanitizeBody(value);
      } else {
        sanitized[cleanKey] = value;
      }
    }
    
    return sanitized;
  },

  // Enhanced authentication validation
  validateAuth: async (authHeader: string | null): Promise<{ valid: boolean; userId?: string }> => {
    if (!authHeader) return { valid: false };
    
    const token = authHeader.replace('Bearer ', '');
    if (!token) return { valid: false };
    
    try {
      // More robust JWT validation
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false };
      
      // Decode and validate JWT structure
      const payload = JSON.parse(atob(parts[1]));
      
      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return { valid: false };
      }
      
      return { 
        valid: true, 
        userId: payload.sub 
      };
    } catch {
      return { valid: false };
    }
  },

  // Comprehensive security headers
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

  // Input validation helper
  validateInputs: (inputs: Record<string, any>, rules: Record<string, any>): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    for (const [field, value] of Object.entries(inputs)) {
      const rule = rules[field];
      if (!rule) continue;
      
      if (rule.required && !validateInput.required(value)) {
        errors.push(`${field} is required`);
      }
      
      if (rule.type === 'email' && value && !validateInput.email(value)) {
        errors.push(`${field} must be a valid email`);
      }
      
      if (rule.minLength && value && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      
      if (rule.maxLength && value && value.length > rule.maxLength) {
        errors.push(`${field} must be no more than ${rule.maxLength} characters`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
};

// Enhanced secure API hook
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
      allowedOrigins,
      csrfProtection = true
    } = config;

    // Rate limiting
    if (rateLimitKey && !rateLimiter.checkLimit(rateLimitKey, maxAttempts, windowMs)) {
      throw new Error('Too many requests. Please try again later.');
    }

    // CSRF Protection
    if (csrfProtection && options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
      const headers = new Headers(options.headers);
      if (!securityMiddleware.validateHeaders(headers, allowedOrigins)) {
        throw new Error('Request blocked by CSRF protection');
      }
    }

    // Sanitize request body
    if (sanitizeBody && options.body) {
      try {
        const body = JSON.parse(options.body as string);
        const sanitizedBody = securityMiddleware.sanitizeBody(body);
        options.body = JSON.stringify(sanitizedBody);
      } catch {
        // Body is not JSON, leave as is
      }
    }

    // Add security headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...securityMiddleware.getSecurityHeaders()
    };

    // Add auth header if required
    if (requireAuth) {
      // Get auth token from Supabase session
      const authData =sessionStorage.getItem('supabase.auth.token');
      if (authData) {
        try {
          const parsedAuth = JSON.parse(authData);
          headers['Authorization'] = `Bearer ${parsedAuth.access_token}`;
        } catch {
          throw new Error('Authentication required');
        }
      } else {
        throw new Error('Authentication required');
      }
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  };

  return { makeSecureRequest };
};
