
import { SecureAPIClient } from '@/utils/secureApiClient';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';

export interface SecurityData {
  alerts: any[];
  auditLogs: any[];
  threatLevel: string;
}

export interface ThreatMonitoringData {
  threats: any[];
  status: string;
  lastCheck: Date;
}

export interface UserProfileData {
  id: string;
  email: string;
  lastSignIn: string;
  securityLevel: string;
}

export class SecurityModel {
  static async fetchSecurityData(): Promise<SecurityData> {
    try {
      // Simulate API call with delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await SecureAPIClient.makeRequest({
        endpoint: '/functions/security-data',
        method: 'GET',
        delay: 500,
        maxRetries: 2
      });

      return {
        alerts: response?.alerts || [],
        auditLogs: response?.auditLogs || [],
        threatLevel: response?.threatLevel || 'LOW'
      };
    } catch (error) {
      console.error('Error fetching security data:', error);
      return {
        alerts: [],
        auditLogs: [],
        threatLevel: 'UNKNOWN'
      };
    }
  }

  static async fetchThreatMonitoringData(): Promise<ThreatMonitoringData> {
    try {
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = await SecureAPIClient.makeRequest({
        endpoint: '/functions/threat-monitoring',
        method: 'GET',
        delay: 750,
        maxRetries: 2
      });

      return {
        threats: response?.threats || [],
        status: response?.status || 'ACTIVE',
        lastCheck: new Date()
      };
    } catch (error) {
      console.error('Error fetching threat monitoring data:', error);
      return {
        threats: [],
        status: 'ERROR',
        lastCheck: new Date()
      };
    }
  }

  static async fetchUserProfileData(userId: string): Promise<UserProfileData | null> {
    try {
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await SecureAPIClient.makeRequest({
        endpoint: '/functions/user-profile',
        method: 'GET',
        data: { userId },
        delay: 1000,
        maxRetries: 2
      });

      return response || null;
    } catch (error) {
      console.error('Error fetching user profile data:', error);
      return null;
    }
  }
}
