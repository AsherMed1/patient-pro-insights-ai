
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

export const useSpeedToLeadCalculation = () => {
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  const triggerSpeedToLeadCalculation = async () => {
    try {
      setCalculating(true);
      
      const { data, error } = await supabase.functions.invoke('speed-to-lead-calculator');
      
      if (error) {
        console.error('Error triggering speed-to-lead calculation:', error);
        toast({
          title: "Error",
          description: "Failed to trigger speed-to-lead calculation",
          variant: "destructive",
        });
      } else {
        console.log('Speed-to-lead calculation result:', data);
        toast({
          title: "Success",
          description: `Speed-to-lead calculation completed. ${data?.stats?.totalProcessed || 0} leads processed.`,
        });
        return true;
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to trigger speed-to-lead calculation",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
    return false;
  };

  return {
    calculating,
    triggerSpeedToLeadCalculation
  };
};
