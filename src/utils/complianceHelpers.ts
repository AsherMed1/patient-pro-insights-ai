
export interface GDPRConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  timestamp: number;
  version: string;
}

export interface DataProcessingRecord {
  id: string;
  userId: string;
  dataType: string;
  purpose: string;
  legalBasis: string;
  timestamp: number;
  retentionPeriod: number;
}

export class ComplianceManager {
  private static readonly CONSENT_STORAGE_KEY = 'gdpr_consent';
  private static readonly CURRENT_CONSENT_VERSION = '1.0';
  
  static getConsentStatus(): GDPRConsent | null {
    try {
      const stored = localStorage.getItem(this.CONSENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  
  static setConsentStatus(consent: Partial<GDPRConsent>): void {
    const fullConsent: GDPRConsent = {
      necessary: true, // Always required
      analytics: consent.analytics || false,
      marketing: consent.marketing || false,
      preferences: consent.preferences || false,
      timestamp: Date.now(),
      version: this.CURRENT_CONSENT_VERSION
    };
    
    try {
      localStorage.setItem(this.CONSENT_STORAGE_KEY, JSON.stringify(fullConsent));
    } catch (error) {
      console.error('Could not store consent:', error);
    }
  }
  
  static isConsentRequired(): boolean {
    const consent = this.getConsentStatus();
    if (!consent) return true;
    
    // Check if consent is outdated (older than 1 year)
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    if (consent.timestamp < oneYearAgo) return true;
    
    // Check if consent version is outdated
    if (consent.version !== this.CURRENT_CONSENT_VERSION) return true;
    
    return false;
  }
  
  static hasAnalyticsConsent(): boolean {
    const consent = this.getConsentStatus();
    return consent?.analytics || false;
  }
  
  static hasMarketingConsent(): boolean {
    const consent = this.getConsentStatus();
    return consent?.marketing || false;
  }
  
  static logDataProcessing(record: Omit<DataProcessingRecord, 'id' | 'timestamp'>): void {
    const fullRecord: DataProcessingRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    
    // In a real implementation, this would be sent to a secure audit log
    console.log('Data processing logged:', fullRecord);
  }
  
  static generateDataExport(userId: string): Promise<any> {
    // In a real implementation, this would collect all user data
    return Promise.resolve({
      userId,
      exportTimestamp: new Date().toISOString(),
      data: {
        profile: 'User profile data would be here',
        activities: 'User activities would be here',
        preferences: 'User preferences would be here'
      },
      format: 'JSON',
      note: 'This is a sample data export for compliance demonstration'
    });
  }
  
  static requestDataDeletion(userId: string): Promise<{ success: boolean; deletionId: string }> {
    // In a real implementation, this would trigger data deletion processes
    const deletionId = crypto.randomUUID();
    
    console.log(`Data deletion requested for user ${userId}, deletion ID: ${deletionId}`);
    
    return Promise.resolve({
      success: true,
      deletionId
    });
  }
  
  static getPrivacyPolicyVersion(): string {
    return '2024-06-21';
  }
  
  static getDataRetentionPolicy(): Record<string, number> {
    return {
      'user_profiles': 365 * 2, // 2 years
      'audit_logs': 365 * 7, // 7 years
      'session_data': 30, // 30 days
      'analytics_data': 365 * 2, // 2 years
      'marketing_data': 365 * 3 // 3 years
    };
  }
}
