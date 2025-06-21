
export interface AdvancedSecurityHeaders {
  'Content-Security-Policy': string;
  'Strict-Transport-Security': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'X-XSS-Protection': string;
  'Cross-Origin-Embedder-Policy': string;
  'Cross-Origin-Opener-Policy': string;
  'Cross-Origin-Resource-Policy': string;
}

export class AdvancedSecurityHeadersManager {
  private static nonce: string | null = null;
  
  static generateNonce(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    this.nonce = btoa(String.fromCharCode(...array));
    return this.nonce;
  }
  
  static getCurrentNonce(): string | null {
    return this.nonce;
  }
  
  static getAdvancedSecurityHeaders(isDevelopment: boolean = false): AdvancedSecurityHeaders {
    const nonce = this.generateNonce();
    
    const baseUrl = isDevelopment ? 'http://localhost:5173' : window.location.origin;
    const supabaseUrl = 'https://bhabbokbhnqioykjimix.supabase.co';
    
    const cspDirectives = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' ${isDevelopment ? "'unsafe-eval'" : ''} https://apis.google.com https://www.gstatic.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com data:`,
      `img-src 'self' data: https: blob:`,
      `connect-src 'self' ${supabaseUrl} wss://*.supabase.co https://api.openai.com https://api.anthropic.com`,
      `frame-src 'none'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`
    ];
    
    if (!isDevelopment) {
      cspDirectives.push(`block-all-mixed-content`);
    }
    
    return {
      'Content-Security-Policy': cspDirectives.join('; '),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()',
      'X-XSS-Protection': '1; mode=block',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    };
  }
  
  static applyAdvancedSecurityHeaders(isDevelopment: boolean = false): void {
    if (typeof document === 'undefined') return;
    
    const headers = this.getAdvancedSecurityHeaders(isDevelopment);
    
    // Apply headers via meta tags
    Object.entries(headers).forEach(([name, content]) => {
      const existingMeta = document.querySelector(`meta[http-equiv="${name}"], meta[name="${name.toLowerCase()}"]`);
      if (!existingMeta) {
        const meta = document.createElement('meta');
        if (name.startsWith('X-') || name.includes('Content-Security-Policy') || name.includes('Strict-Transport-Security')) {
          meta.httpEquiv = name;
        } else {
          meta.name = name.toLowerCase();
        }
        meta.content = content;
        document.head.appendChild(meta);
      }
    });
  }
  
  static validateSecurityHeaders(): { isSecure: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check if running over HTTPS in production
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      issues.push('Site not served over HTTPS');
    }
    
    // Check for CSP header
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta) {
      issues.push('Content Security Policy not found');
    }
    
    // Check for HSTS header (production only)
    if (location.protocol === 'https:') {
      const hstsMeta = document.querySelector('meta[http-equiv="Strict-Transport-Security"]');
      if (!hstsMeta) {
        issues.push('HSTS header not found on HTTPS site');
      }
    }
    
    return {
      isSecure: issues.length === 0,
      issues
    };
  }
}

// Initialize advanced security headers
if (typeof window !== 'undefined') {
  AdvancedSecurityHeadersManager.applyAdvancedSecurityHeaders(process.env.NODE_ENV === 'development');
}
