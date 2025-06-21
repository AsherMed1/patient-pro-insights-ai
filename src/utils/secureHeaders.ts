
export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security'?: string;
  'X-XSS-Protection': string;
}

export class SecureHeadersManager {
  private static nonce: string | null = null;
  
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    this.nonce = btoa(String.fromCharCode(...array));
    return this.nonce;
  }
  
  static getCurrentNonce(): string | null {
    return this.nonce;
  }
  
  static getSecurityHeaders(isDevelopment: boolean = false): SecurityHeaders {
    const nonce = this.generateNonce();
    
    const headers: SecurityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'X-XSS-Protection': '1; mode=block'
    };
    
    // Only add HSTS in production with HTTPS
    if (!isDevelopment) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }
    
    // CSP policy
    const cspDirectives = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' https://apis.google.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: https:`,
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
      `frame-src 'none'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`
    ];
    
    headers['Content-Security-Policy'] = cspDirectives.join('; ');
    
    return headers;
  }
  
  static applySecurityHeaders(isDevelopment: boolean = false): void {
    if (typeof document === 'undefined') return;
    
    const headers = this.getSecurityHeaders(isDevelopment);
    
    // Apply CSP via meta tag (backup method)
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!existingCSP && headers['Content-Security-Policy']) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = headers['Content-Security-Policy'];
      document.head.appendChild(meta);
    }
    
    // Apply referrer policy
    const existingReferrer = document.querySelector('meta[name="referrer"]');
    if (!existingReferrer) {
      const meta = document.createElement('meta');
      meta.name = 'referrer';
      meta.content = headers['Referrer-Policy'];
      document.head.appendChild(meta);
    }
  }
  
  static validateNonce(nonce: string): boolean {
    return typeof nonce === 'string' && nonce.length > 0 && /^[A-Za-z0-9+/=]+$/.test(nonce);
  }
}

// Initialize security headers on load
if (typeof window !== 'undefined') {
  SecureHeadersManager.applySecurityHeaders(process.env.NODE_ENV === 'development');
}
