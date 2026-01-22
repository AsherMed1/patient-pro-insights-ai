import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserAttributionData {
  userId: string | null;
  userName: string;
  isLoaded: boolean;
}

export const useUserAttribution = (): UserAttributionData => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name?: string } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          setProfile(data);
        } catch {
          // Ignore errors, profile is optional
        }
      }
      setIsLoaded(true);
    };
    
    fetchProfile();
  }, [user]);

  return {
    userId: user?.id || null,
    userName: profile?.full_name || user?.email || 'Unknown User',
    isLoaded
  };
};
