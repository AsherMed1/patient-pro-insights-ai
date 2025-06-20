
// Simplified enhanced security middleware
export const enhancedSecurityMiddleware = {
  sanitizeData: (data: any): any => {
    if (typeof data === 'string') {
      return data.trim().substring(0, 1000);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => enhancedSecurityMiddleware.sanitizeData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const cleanKey = key.substring(0, 50);
        sanitized[cleanKey] = enhancedSecurityMiddleware.sanitizeData(value);
      }
      return sanitized;
    }
    
    return data;
  },

  checkRateLimit: (identifier: string, action: string, config: any = {}): boolean => {
    const key = `${identifier}:${action}`;
    const maxAttempts = config.maxAttempts || 5;
    const windowMs = config.windowMs || 15 * 60 * 1000;
    
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

      return data.attempts < maxAttempts;
    } catch (error) {
      console.error('Rate limiter error:', error);
      return true;
    }
  }
};

export const useSecureAPI = () => {
  const makeSecureRequest = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  };

  return { makeSecureRequest };
};
