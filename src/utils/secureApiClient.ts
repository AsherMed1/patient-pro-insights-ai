
import { supabase } from '@/integrations/supabase/client';
import { EnhancedSecurityLogger } from './enhancedSecurityLogger';
import { EnhancedSecurityValidator } from './securityEnhancedValidator';

export interface SecureAPIRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  requiresAuth?: boolean;
  rateLimitKey?: string;
}

export class SecureAPIClient {
  private static readonly MAX_REQUEST_SIZE = 1024 * 1024; // 1MB
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  static async makeRequest(request: SecureAPIRequest): Promise<any> {
    const { endpoint, method, data, requiresAuth = true, rateLimitKey } = request;

    try {
      // Rate limiting check
      if (rateLimitKey) {
        const clientIP = await this.getClientIP();
        const limitKey = `${rateLimitKey}_${clientIP}`;
        
        if (EnhancedSecurityValidator.isRateLimited(limitKey, 50, 60000)) { // 50 requests per minute
          EnhancedSecurityLogger.logRateLimitExceeded(limitKey, rateLimitKey);
          throw new Error('Rate limit exceeded. Please try again later.');
        }
      }

      // Request size validation
      if (data && JSON.stringify(data).length > this.MAX_REQUEST_SIZE) {
        throw new Error('Request size exceeds maximum allowed size');
      }

      // Authentication check
      if (requiresAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Authentication required');
        }
      }

      // Content type validation for POST/PUT
      if ((method === 'POST' || method === 'PUT') && data) {
        if (typeof data !== 'object') {
          throw new Error('Invalid request data format');
        }
      }

      // Make the request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

      let response;
      
      if (endpoint.startsWith('/functions/')) {
        // Supabase Edge Function call
        response = await supabase.functions.invoke(endpoint.replace('/functions/', ''), {
          body: data,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': crypto.randomUUID(),
            'X-Client-Version': '1.0.0'
          }
        });
      } else {
        // Regular HTTP request (if needed)
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': crypto.randomUUID(),
          },
          signal: controller.signal,
        };

        if (data && (method === 'POST' || method === 'PUT')) {
          fetchOptions.body = JSON.stringify(data);
        }

        const fetchResponse = await fetch(endpoint, fetchOptions);
        response = { data: await fetchResponse.json(), error: fetchResponse.ok ? null : 'Request failed' };
      }

      clearTimeout(timeoutId);

      // Log API call
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'api_call',
        severity: 'LOW',
        details: {
          endpoint,
          method,
          success: !response.error,
          responseStatus: response.status
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'API request failed');
      }

      return response.data;

    } catch (error) {
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'api_call',
        severity: 'MEDIUM',
        details: {
          endpoint,
          method,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        }
      });
      
      throw error;
    }
  }

  private static async getClientIP(): Promise<string> {
    try {
      // In a real application, you might get this from a header or service
      // For now, use a fallback identifier
      return `client_${Date.now()}`;
    } catch {
      return 'unknown';
    }
  }
}
