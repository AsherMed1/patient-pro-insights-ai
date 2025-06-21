
import { SecurityModel } from '@/models/SecurityModel';

export interface LoadingState {
  securityData: boolean;
  threatMonitoring: boolean;
  userProfile: boolean;
}

export class SecurityController {
  static async loadSecurityDataSequentially(
    setLoadingStates: (updater: (prev: LoadingState) => LoadingState) => void,
    onDataLoaded?: (data: any) => void
  ) {
    try {
      // Load security data first
      const securityData = await SecurityModel.fetchSecurityData();
      setLoadingStates(prev => ({ ...prev, securityData: false }));
      onDataLoaded?.(securityData);

      // Load threat monitoring data
      const threatData = await SecurityModel.fetchThreatMonitoringData();
      setLoadingStates(prev => ({ ...prev, threatMonitoring: false }));
      onDataLoaded?.(threatData);

      // Load user profile data
      const userProfileData = await SecurityModel.fetchUserProfileData('current-user');
      setLoadingStates(prev => ({ ...prev, userProfile: false }));
      onDataLoaded?.(userProfileData);

    } catch (error) {
      console.error('Error loading security data:', error);
    }
  }
}
