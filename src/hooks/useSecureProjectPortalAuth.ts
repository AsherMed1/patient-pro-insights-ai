
import { useEnhancedProjectPortalAuth } from './useEnhancedProjectPortalAuth';

// Backward compatibility wrapper  
export const useSecureProjectPortalAuth = (projectName: string) => {
  return useEnhancedProjectPortalAuth(projectName);
};
