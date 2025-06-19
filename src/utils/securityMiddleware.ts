
// Security middleware for API endpoints and form submissions
import { sanitizeInput, validateInput, rateLimiter } from './inputSanitizer';

export interface SecurityConfig {
  requireAuth?: boolean;
  rateLimitKey?: string;
  maxAttempts?: number;
  windowMs?: number;
  sanitizeBody?: boolean;
  allowedOrigins?: string[];
}

export const securityMiddleware = {
  // Validate request headers for CSRF protection
  validateHeaders: (headers: Headers): boolean => {
    const origin = headers.get('origin');
    const referer = headers.get('referer');
    
    // Allow same-origin requests
    if (origin && referer) {
      const originHost = new URL(origin).hostname;
      const refererHost = new URL(referer).hostname;
      return originHost === refererHost;
    }
    
    return true; // Allow requests without origin/referer for now
  },

  // Rate limiting check
  checkRateLimit: (key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
    return rateLimiter.checkLimit(key, maxAttempts, windowMs);
  },

  // Sanitize request body
  sanitizeBody: (body: any): any => {
    if (!body || typeof body !== 'object') return body;

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput.text(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = securityMiddleware.sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  },

  // Validate authentication token
  validateAuth: async (authHeader: string | null): Promise<boolean> => {
    if (!authHeader) return false;
    
    const token = authHeader.replace('Bearer ', '');
    if (!token) return false;
    
    try {
      // Basic token validation - in production, verify JWT signature
      const parts = token.split('.');
      return parts.length === 3;
    } catch {
      return false;
    }
  },

  // Security headers for responses
  getSecurityHeaders: (): Record<string, string> => ({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  })
};

// Hook for secure API calls
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
      sanitizeBody = true
    } = config;

    // Rate limiting
    if (rateLimitKey && !rateLimiter.checkLimit(rateLimitKey, maxAttempts, windowMs)) {
      throw new Error('Too many requests. Please try again later.');
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
      const token = localStorage.getItem('supabase.auth.token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
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
