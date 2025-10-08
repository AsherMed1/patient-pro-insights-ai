import { supabase } from '@/integrations/supabase/client';

interface LogAuditParams {
  entity: string;
  action: string;
  description: string;
  source?: 'manual' | 'automation' | 'api';
  metadata?: any;
}

export const useAuditLog = () => {
  const logAudit = async ({
    entity,
    action,
    description,
    source = 'manual',
    metadata = {}
  }: LogAuditParams) => {
    try {
      const { error } = await supabase.rpc('log_audit_event', {
        p_entity: entity,
        p_action: action,
        p_description: description,
        p_source: source,
        p_metadata: metadata
      });

      if (error) {
        console.error('Failed to log audit event:', error);
      }
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  };

  return { logAudit };
};
