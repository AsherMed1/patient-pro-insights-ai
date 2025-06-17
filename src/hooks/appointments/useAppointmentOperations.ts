
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAppointmentOperations = () => {
  const { toast } = useToast();

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateProcedureOrdered = async (appointmentId: string, procedureOrdered: boolean) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({ procedure_ordered: procedureOrdered, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Procedure status updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating procedure status:', error);
      toast({
        title: "Error",
        description: "Failed to update procedure status",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    updateAppointmentStatus,
    updateProcedureOrdered
  };
};
