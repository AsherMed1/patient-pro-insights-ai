
export interface DeviceFingerprint {
  id: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  onlineStatus: boolean;
  timestamp: number;
}

export class DeviceFingerprintManager {
  private static readonly STORAGE_KEY = 'device_fingerprint';
  
  static generateFingerprint(): DeviceFingerprint {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        id: 'server-side',
        userAgent: 'server',
        screenResolution: '0x0',
        timezone: 'UTC',
        language: 'en',
        platform: 'server',
        cookieEnabled: false,
        onlineStatus: false,
        timestamp: Date.now()
      };
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillText('Security fingerprint', 10, 10);
    }
    const canvasFingerprint = canvas.toDataURL();
    
    const components = [
      navigator.userAgent || 'unknown',
      `${screen.width}x${screen.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      navigator.language || 'en',
      navigator.platform || 'unknown',
      navigator.cookieEnabled.toString(),
      navigator.onLine.toString(),
      canvasFingerprint.substring(0, 50)
    ];
    
    const fingerprint: DeviceFingerprint = {
      id: this.hashComponents(components),
      userAgent: navigator.userAgent || 'unknown',
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      language: navigator.language || 'en',
      platform: navigator.platform || 'unknown',
      cookieEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      timestamp: Date.now()
    };
    
    return fingerprint;
  }
  
  private static hashComponents(components: string[]): string {
    const combined = components.join('|');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  static getStoredFingerprint(): DeviceFingerprint | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  
  static storeFingerprint(fingerprint: DeviceFingerprint): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fingerprint));
    } catch (error) {
      console.warn('Could not store device fingerprint:', error);
    }
  }
  
  static validateSession(currentFingerprint: DeviceFingerprint, storedFingerprint: DeviceFingerprint): {
    isValid: boolean;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    changedComponents: string[];
  } {
    const changedComponents: string[] = [];
    
    if (currentFingerprint.userAgent !== storedFingerprint.userAgent) {
      changedComponents.push('userAgent');
    }
    if (currentFingerprint.screenResolution !== storedFingerprint.screenResolution) {
      changedComponents.push('screenResolution');
    }
    if (currentFingerprint.timezone !== storedFingerprint.timezone) {
      changedComponents.push('timezone');
    }
    if (currentFingerprint.platform !== storedFingerprint.platform) {
      changedComponents.push('platform');
    }
    
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    
    if (changedComponents.length === 0) {
      riskLevel = 'LOW';
    } else if (changedComponents.length <= 2) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'HIGH';
    }
    
    // High risk if core components changed
    if (chan
    gedComponents.includes('userAgent') && changedComponents.includes('platform')) {
      riskLevel = 'HIGH';
    }
    
    return {
      isValid: riskLevel !== 'HIGH',
      riskLevel,
      changedComponents
    };
  }
  
  static initializeDeviceTracking(): void {
    if (typeof window === 'undefined') return;
    
    const currentFingerprint = this.generateFingerprint();
    const storedFingerprint = this.getStoredFingerprint();
    
    if (!storedFingerprint) {
      this.storeFingerprint(currentFingerprint);
      return;
    }
    
    const validation = this.validateSession(currentFingerprint, storedFingerprint);
    
    if (validation.riskLevel === 'HIGH') {
      console.warn('High-risk session detected:', validation.changedComponents);
    }
    
    // Update stored fingerprint with current timestamp
    this.storeFingerprint(currentFingerprint);
  }
}

// Initialize device fingerprinting only in browser
if (typeof window !== 'undefined') {
  DeviceFingerprintManager.initializeDeviceTracking();
}
