
import { supabase } from '@/integrations/supabase/client';
import { EnhancedSecurityLogger } from './enhancedSecurityLogger';
import { EnhancedSecurityValidator } from './securityEnhancedValidator';

export interface SecureAPIRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  requiresAuth?: boolean;
  rateLimitKey?: string;
  delay?: number; // Add configurable delay
  maxRetries?: number; // Add retry logic
}

export class SecureAPIClient {
  private static readonly MAX_REQUEST_SIZE = 1024 * 1024; // 1MB
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly DEFAULT_DELAY = 1000; // 1 second default delay
  private static readonly DEFAULT_MAX_RETRIES = 3;

  static async makeRequest(request: SecureAPIRequest): Promise<any> {
    const { 
      endpoint, 
      method, 
      data, 
      requiresAuth = true, 
      rateLimitKey,
      delay = this.DEFAULT_DELAY,
      maxRetries = this.DEFAULT_MAX_RETRIES
    } = request;

    // Add initial delay to avoid rate limiting
    if (delay > 0) {
      await this.sleep(delay);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Rate limiting check
        if (rateLimitKey) {
          const clientIP = await this.getClientIP();
          const limitKey = `${rateLimitKey}_${clientIP}`;
          
          if (EnhancedSecurityValidator.isRateLimited(limitKey, 30, 60000)) { // Reduced to 30 requests per minute
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

        // Log successful API call
        EnhancedSecurityLogger.logSecurityEvent({
          type: 'api_call',
          severity: 'LOW',
          details: {
            endpoint,
            method,
            success: !response.error,
            responseStatus: response.status,
            attempt
          }
        });

        if (response.error) {
          throw new Error(response.error.message || 'API request failed');
        }

        return response.data;

      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a 403 error or rate limit error
        const is403Error = lastError.message.includes('403') || 
                          lastError.message.includes('Rate limit') ||
                          lastError.message.includes('rate limit');
        
        if (is403Error && attempt < maxRetries) {
          // Exponential backoff for 403 errors
          const retryDelay = delay * Math.pow(2, attempt - 1);
          console.log(`API request failed with 403/rate limit error. Retrying in ${retryDelay}ms... (attempt ${attempt}/${maxRetries})`);
          
          await this.sleep(retryDelay);
          continue;
        }

        // Log failed API call
        EnhancedSecurityLogger.logSecurityEvent({
          type: 'api_call',
          severity: 'MEDIUM',
          details: {
            endpoint,
            method,
            error: lastError.message,
            success: false,
            attempt,
            finalAttempt: attempt === maxRetries
          }
        });

        // If this was our last attempt, break out of the loop
        if (attempt === maxRetries) {
          break;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
