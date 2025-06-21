
import React from 'react';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';
import { ThreatDetectionMonitor } from '@/components/security/ThreatDetectionMonitor';
import { GDPRConsentBanner } from '@/components/security/GDPRConsentBanner';

const SecurityCenter = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SecurityDashboard />
        <ThreatDetectionMonitor />
        <GDPRConsentBanner />
      </div>
    </div>
  );
};

export default SecurityCenter;
