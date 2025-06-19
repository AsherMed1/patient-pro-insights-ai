
import { useEnhancedProjectPortalAuth } from './useEnhancedProjectPortalAuth';

// Backward compatibility wrapper
export const useProjectPortalAuth = (projectName: string) => {
  return useEnhancedProjectPortalAuth(projectName);
};
