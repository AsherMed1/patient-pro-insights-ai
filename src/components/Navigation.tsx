
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Navigation: React.FC = () => {
  const { signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <Link to="/">
            <Button 
              variant={location.pathname === '/' ? 'default' : 'ghost'}
              size="sm"
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Profile
            </Button>
          </Link>
          
          <Link to="/security">
            <Button 
              variant={location.pathname === '/security' ? 'default' : 'ghost'}
              size="sm"
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Security Center
            </Button>
          </Link>
        </div>

        <Button 
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
};
