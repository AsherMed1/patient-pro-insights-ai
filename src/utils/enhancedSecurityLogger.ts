
import { supabase } from '@/integrations/supabase/client';

export class EnhancedSecurityLogger {
  private static instance: EnhancedSecurityLogger;
  private logQueue: Array<{
    event_type: string;
    ip_address?: string;
    user_agent?: string;
    details?: any;
  }> = [];
  private isProcessing = false;

  static getInstance(): EnhancedSecurityLogger {
    if (!EnhancedSecurityLogger.instance) {
      EnhancedSecurityLogger.instance = new EnhancedSecurityLogger();
    }
    return EnhancedSecurityLogger.instance;
  }

  async logSecurityEvent(
    eventType: string,
    details?: any,
    immediate: boolean = false
  ): Promise<void> {
    const logEntry = {
      event_type: eventType,
      ip_address: await this.getClientIP(),
      user_agent: navigator.userAgent,
      details: details ? JSON.stringify(details) : null
    };

    if (immediate) {
      await this.sendLogEntry(logEntry);
    } else {
      this.logQueue.push(logEntry);
      this.processQueue();
    }
  }

  private async getClientIP(): Promise<string | null> {
    try {
      // Note: This is a simplified approach. In production, you'd want to use a proper IP detection service
      return null; // Browser can't reliably get client IP
    } catch {
      return null;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.logQueue.splice(0, 10); // Process in batches of 10
      
      for (const entry of batch) {
        await this.sendLogEntry(entry);
      }
    } catch (error) {
      console.error('Failed to process security log queue:', error);
    } finally {
      this.isProcessing = false;
      
      // Continue processing if more entries exist
      if (this.logQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  private async sendLogEntry(entry: any): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_security_event', {
        event_type_param: entry.event_type,
        ip_address_param: entry.ip_address,
        user_agent_param: entry.user_agent,
        details_param: entry.details ? JSON.parse(entry.details) : null
      });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Error sending security log:', error);
    }
  }

  // Common security events
  async logAuthAttempt(success: boolean, details?: any): Promise<void> {
    await this.logSecurityEvent(
      success ? 'auth_success' : 'auth_failure',
      { success, ...details },
      true
    );
  }

  async logFormSubmission(formType: string, projectName?: string): Promise<void> {
    await this.logSecurityEvent('form_submission', {
      form_type: formType,
      project_name: projectName
    });
  }

  async logDataAccess(table: string, action: string, recordCount?: number): Promise<void> {
    await this.logSecurityEvent('data_access', {
      table,
      action,
      record_count: recordCount
    });
  }

  async logSuspiciousActivity(activityType: string, details: any): Promise<void> {
    await this.logSecurityEvent('suspicious_activity', {
      activity_type: activityType,
      ...details
    }, true);
  }

  async logRateLimitHit(endpoint: string, attempts: number): Promise<void> {
    await this.logSecurityEvent('rate_limit_hit', {
      endpoint,
      attempts
    }, true);
  }
}

// Export singleton instance
export const securityLogger = EnhancedSecurityLogger.getInstance();
