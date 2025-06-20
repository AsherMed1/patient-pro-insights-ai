
import { supabase } from '@/integrations/supabase/client';

interface SecureRequestOptions extends RequestInit {
  rateLimitKey?: string;
  maxAttempts?: number;
  windowMs?: number;
  requireAuth?: boolean;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

class SecureApiClient {
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  private checkRateLimit(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    // Only run on client side
    if (typeof window === 'undefined') return true;
    
    const now = Date.now();
    const record = this.rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  private getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    };
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        sanitized[key] = value.replace(/[<>]/g, '');
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeRequestBody(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  async makeRequest<T = any>(
    url: string, 
    options: SecureRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      rateLimitKey,
      maxAttempts = 5,
      windowMs = 15 * 60 * 1000,
      requireAuth = false,
      ...requestOptions
    } = options;

    try {
      if (rateLimitKey && !this.checkRateLimit(rateLimitKey, maxAttempts, windowMs)) {
        return {
          success: false,
          error: 'Too many requests. Please try again later.'
        };
      }

      const headers = {
        ...this.getSecurityHeaders(),
        ...requestOptions.headers
      };

      if (requireAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          return {
            success: false,
            error: 'Authentication required'
          };
        }
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      let body = requestOptions.body;
      if (body && typeof body === 'string') {
        try {
          const parsedBody = JSON.parse(body);
          const sanitizedBody = this.sanitizeRequestBody(parsedBody);
          body = JSON.stringify(sanitizedBody);
        } catch {
          // Body is not JSON, leave as is
        }
      }

      const response = await fetch(url, {
        ...requestOptions,
        headers,
        body
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };

    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }

  async get<T = any>(url: string, options: SecureRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'GET' });
  }

  async post<T = any>(url: string, data: any, options: SecureRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put<T = any>(url: string, data: any, options: SecureRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete<T = any>(url: string, options: SecureRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { ...options, method: 'DELETE' });
  }
}

export const secureApiClient = new SecureApiClient();
