
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, Cookie, Settings } from 'lucide-react';
import { ComplianceManager, GDPRConsent } from '@/utils/complianceHelpers';

export const GDPRConsentBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<Partial<GDPRConsent>>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    const needsConsent = ComplianceManager.isConsentRequired();
    setShowBanner(needsConsent);
    
    const existingConsent = ComplianceManager.getConsentStatus();
    if (existingConsent) {
      setConsent(existingConsent);
    }
  }, []);

  const handleAcceptAll = () => {
    const allConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    setConsent(allConsent);
    ComplianceManager.setConsentStatus(allConsent);
    setShowBanner(false);
  };

  const handleAcceptSelected = () => {
    ComplianceManager.setConsentStatus(consent);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const minimalConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    setConsent(minimalConsent);
    ComplianceManager.setConsentStatus(minimalConsent);
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/20 to-transparent">
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Cookie className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">Privacy & Cookie Consent</h3>
                <Badge variant="outline" className="text-xs">
                  GDPR Compliant
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                We use cookies and similar technologies to provide, protect, and improve our services. 
                Some are essential for site functionality, while others help us understand usage patterns 
                and personalize content.
              </p>

              {showDetails && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-sm">Necessary Cookies</label>
                      <p className="text-xs text-gray-500">Required for basic site functionality</p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-sm">Analytics</label>
                      <p className="text-xs text-gray-500">Help us understand how you use our site</p>
                    </div>
                    <Switch 
                      checked={consent.analytics} 
                      onCheckedChange={(checked) => setConsent(prev => ({ ...prev, analytics: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-sm">Marketing</label>
                      <p className="text-xs text-gray-500">Personalized content and ads</p>
                    </div>
                    <Switch 
                      checked={consent.marketing} 
                      onCheckedChange={(checked) => setConsent(prev => ({ ...prev, marketing: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-sm">Preferences</label>
                      <p className="text-xs text-gray-500">Remember your settings and choices</p>
                    </div>
                    <Switch 
                      checked={consent.preferences} 
                      onCheckedChange={(checked) => setConsent(prev => ({ ...prev, preferences: checked }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleAcceptAll} size="sm">
                  Accept All
                </Button>
                
                <Button 
                  onClick={() => setShowDetails(!showDetails)} 
                  variant="outline" 
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Customize
                </Button>
                
                {showDetails && (
                  <Button onClick={handleAcceptSelected} variant="outline" size="sm">
                    Save Preferences
                  </Button>
                )}
                
                <Button onClick={handleRejectAll} variant="ghost" size="sm">
                  Reject All
                </Button>
              </div>
              
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <a href="#" className="hover:underline">Privacy Policy</a>
                <a href="#" className="hover:underline">Cookie Policy</a>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>Your data is protected</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
