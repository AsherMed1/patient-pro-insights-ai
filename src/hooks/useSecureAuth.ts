
import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';

export const useSecureAuth = () => {
  const auth = useAuth();
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    if (auth.user) {
      setLastActivity(Date.now());
    }
  }, [auth.user]);

  const secureSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const updateActivity = () => {
    setLastActivity(Date.now());
  };

  return {
    ...auth,
    secureSignOut,
    updateActivity,
    lastActivity
  };
};
