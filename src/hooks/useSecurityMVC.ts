
import { useState, useEffect } from 'react';
import { SecurityController, LoadingState } from '@/controllers/SecurityController';

export const useSecurityMVC = (user: any) => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({
    securityData: true,
    threatMonitoring: true,
    userProfile: true
  });

  const [securityData, setSecurityData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    SecurityController.loadSecurityDataSequentially(
      setLoadingStates,
      (data) => setSecurityData(data)
    );
  }, [user]);

  return {
    loadingStates,
    securityData
  };
};
