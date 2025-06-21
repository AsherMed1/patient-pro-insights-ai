
import React, { useEffect } from 'react';
import { useSecurityConfig } from '@/hooks/useSecurityConfig';

export const SecurityHeaders: React.FC = () => {
  const { config } = useSecurityConfig();

  useEffect(() => {
    if (!config?.csp_policy) return;

    // Apply Content Security Policy
    const cspDirectives = Object.entries(config.csp_policy)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');

    const metaTag = document.createElement('meta');
    metaTag.httpEquiv = 'Content-Security-Policy';
    metaTag.content = cspDirectives;
    
    // Remove existing CSP meta tag if present
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existingCSP) {
      existingCSP.remove();
    }
    
    document.head.appendChild(metaTag);

    // Apply other security headers via meta tags where possible
    const securityHeaders = [
      { httpEquiv: 'X-Content-Type-Options', content: 'nosniff' },
      { httpEquiv: 'X-Frame-Options', content: 'DENY' },
      { httpEquiv: 'X-XSS-Protection', content: '1; mode=block' },
      { httpEquiv: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
    ];

    securityHeaders.forEach(header => {
      const existing = document.querySelector(`meta[http-equiv="${header.httpEquiv}"]`);
      if (existing) existing.remove();

      const meta = document.createElement('meta');
      meta.httpEquiv = header.httpEquiv;
      meta.content = header.content;
      document.head.appendChild(meta);
    });

    return () => {
      // Cleanup on unmount
      securityHeaders.forEach(header => {
        const meta = document.querySelector(`meta[http-equiv="${header.httpEquiv}"]`);
        if (meta) meta.remove();
      });
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (cspMeta) cspMeta.remove();
    };
  }, [config]);

  return null; // This component only manages head elements
};
