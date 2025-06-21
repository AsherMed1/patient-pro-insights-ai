
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityConfig {
  csp_policy: Record<string, string[]>;
  rate_limits: Record<string, number>;
  session_timeout: {
    warning_minutes: number;
    max_idle_minutes: number;
  };
}

export const useSecurityConfig = () => {
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSecurityConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('security_config')
          .select('config_key, config_value')
          .eq('is_active', true);

        if (error) {
          console.error('Failed to fetch security config:', error);
          return;
        }

        const configObj: any = {};
        data?.forEach(item => {
          configObj[item.config_key] = item.config_value;
        });

        setConfig(configObj as SecurityConfig);
      } catch (error) {
        console.error('Security config fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityConfig();
  }, []);

  return { config, loading };
};
