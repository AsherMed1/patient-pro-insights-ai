
import { useAuth } from './useAuth';

export const useSecureAuth = () => {
  const auth = useAuth();

  return {
    ...auth,
    secureSignOut: auth.signOut,
    updateActivity: () => {},
    lastActivity: Date.now()
  };
};
