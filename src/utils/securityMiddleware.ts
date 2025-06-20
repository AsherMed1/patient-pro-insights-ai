
// Simplified security middleware to prevent build failures
interface SecurityConfig {
  requireAuth?: boolean;
  rateLimitKey?: string;
  maxAttempts?: number;
  windowMs?: number;
}

// Simple rate limiting using localStorage
const checkRateLimit = (key: string, maxAttempts: number, windowMs: number): boolean => {
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
      localStorage.setItem(`rate_limit_${key}`, JSON.stringify({
        attempts: 1,
        timestamp: now
      }));
      return true;
    }

    if (data.attempts >= maxAttempts) {
      return false;
    }

    localStorage.setItem(`rate_limit_${key}`, JSON.stringify({
      attempts: data.attempts + 1,
      timestamp: data.timestamp
    }));
    
    return true;
  } catch (error) {
    console.error('Rate limiter error:', error);
    return true;
  }
};

export const securityMiddleware = {
  checkRateLimit,
  
  getSecurityHeaders: (): Record<string, string> => ({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self';"
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
