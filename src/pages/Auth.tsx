
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthMVC } from '@/hooks/useAuthMVC';
import { useSecurityMVC } from '@/hooks/useSecurityMVC';
import { AuthenticatedView } from '@/components/auth/AuthenticatedView';
import { UnauthenticatedView } from '@/components/auth/UnauthenticatedView';

const Auth = () => {
  const { user } = useAuth();
  const authMVC = useAuthMVC();
  const securityMVC = useSecurityMVC(user);

  if (user) {
    return (
      <AuthenticatedView 
        user={user}
        loadingStates={securityMVC.loadingStates}
        securityData={securityMVC.securityData}
      />
    );
  }

  return (
    <UnauthenticatedView 
      authMVC={authMVC}
    />
  );
};

export default Auth;
