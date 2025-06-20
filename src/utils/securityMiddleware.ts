
// Simplified security middleware for deployment safety
interface SecurityConfig {
  requireAuth?: boolean;
  rateLimitKey?: string;
  maxAttempts?: number;
  windowMs?: number;
}

// Simple in-memory rate limiting for client-side only
const rateLimitCache = new Map<string, { attempts: number; timestamp: number }>();

const checkRateLimit = (key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
  // Only run on client side
  if (typeof window === 'undefined') return true;
  
  try {
    const now = Date.now();
    const record = rateLimitCache.get(key);
    
    if (!record || now - record.timestamp > windowMs) {
      rateLimitCache.set(key, { attempts: 1, timestamp: now });
      return true;
    }
    
    if (record.attempts >= maxAttempts) {
      return false;
    }
    
    record.attempts++;
    return true;
  } catch (error) {
    console.error('Rate limiter error:', error);
    return true; // Fail open
  }
};

export const securityMiddleware = {
  checkRateLimit,
  
  getSecurityHeaders: (): Record<string, string> => ({
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  })
};

export const useSecureAPI = () => {
  const makeSecureRequest = async (
    url: string,
    options: RequestInit = {},
    config: SecurityConfig = {}
  ) => {
    const {
      rateLimitKey,
      maxAttempts = 5,
      windowMs = 15 * 60 * 1000
    } = config;

    if (rateLimitKey && !checkRateLimit(rateLimitKey, maxAttempts, windowMs)) {
      throw new Error('Too many requests. Please try again later.');
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

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
