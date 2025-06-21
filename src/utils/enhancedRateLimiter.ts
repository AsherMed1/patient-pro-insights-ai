
import { supabase } from '@/integrations/supabase/client';

export interface RateLimitConfig {
  identifier: string;
  endpoint: string;
  maxRequests?: number;
  windowMinutes?: number;
}

export class EnhancedRateLimiter {
  static async checkRateLimit(config: RateLimitConfig): Promise<boolean> {
    const {
      identifier,
      endpoint,
      maxRequests = 100,
      windowMinutes = 1
    } = config;

    try {
      const { data, error } = await supabase.rpc('check_rate_limit_v2', {
        identifier_param: identifier,
        endpoint_param: endpoint,
        max_requests_param: maxRequests,
        window_minutes_param: windowMinutes
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return false; // Fail closed - deny request if check fails
      }

      return data as boolean;
    } catch (error) {
      console.error('Rate limiter error:', error);
      return false; // Fail closed
    }
  }

  static async logSecurityEvent(
    eventType: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'INFO' as any,
    details: Record<string, any> = {},
    endpoint?: string
  ): Promise<void> {
    try {
      await supabase.rpc('log_security_event_v2', {
        event_type_param: eventType,
        severity_param: severity,
        user_id_param: null,
        session_id_param: null,
        ip_address_param: null,
        user_agent_param: navigator.userAgent,
        details_param: details,
        endpoint_param: endpoint
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  static getClientIdentifier(): string {
    // Create a client identifier based on available information
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const platform = navigator.platform;
    const timestamp = Date.now();
    
    // Simple hash function for client fingerprinting
    const fingerprint = btoa(`${userAgent}-${language}-${platform}-${timestamp}`).slice(0, 16);
    return `client_${fingerprint}`;
  }
}
