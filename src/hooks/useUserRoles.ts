
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'user';

export const useUserRoles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchUserRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to fetch user roles:', error);
          return;
        }

        setRoles(data?.map(item => item.role as AppRole) || []);
      } catch (error) {
        console.error('User roles fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoles();
  }, [user]);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  const isModerator = (): boolean => {
    return hasRole('moderator') || hasRole('admin');
  };

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isModerator
  };
};
