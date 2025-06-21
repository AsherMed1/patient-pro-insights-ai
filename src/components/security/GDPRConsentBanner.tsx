
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Cookie, Info } from 'lucide-react';
import { ComplianceManager } from '@/utils/complianceHelpers';

export const GDPRConsentBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setShowBanner(ComplianceManager.isConsentRequired());
  }, []);

  const handleAcceptAll = () => {
    ComplianceManager.setConsentStatus({
      analytics: true,
      marketing: true,
      preferences: true
    });
    setShowBanner(false);
  };

  const handleAcceptNecessary = () => {
    ComplianceManager.setConsentStatus({
      analytics: false,
      marketing: false,
      preferences: false
    });
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">Cookie Consent</h3>
                <Badge variant="outline" className="text-xs">
                  GDPR Compliant
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                We use cookies to enhance your experience, analyze site traffic, and provide personalized content. 
                Your privacy is important to us.
              </p>

              {showDetails && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <strong>Necessary:</strong> Required for basic site functionality (always enabled)
                    </div>
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      <strong>Analytics:</strong> Help us understand how you use our site
                    </div>
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-purple-600" />
                      <strong>Marketing:</strong> Used to provide relevant advertisements
                    </div>
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-orange-600" />
                      <strong>Preferences:</strong> Remember your settings and preferences
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleAcceptAll} size="sm">
                  Accept All
                </Button>
                <Button onClick={handleAcceptNecessary} variant="outline" size="sm">
                  Necessary Only
                </Button>
                <Button 
                  onClick={() => setShowDetails(!showDetails)} 
                  variant="ghost" 
                  size="sm"
                >
                  {showDetails ? 'Hide' : 'Show'} Details
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
