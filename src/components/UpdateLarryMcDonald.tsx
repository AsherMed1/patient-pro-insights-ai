import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { updateLarryMcDonaldAppointment } from '@/utils/updateLarryMcDonald';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
const UpdateLarryMcDonald: React.FC = () => {
  const [updating, setUpdating] = useState(false);
  const {
    toast
  } = useToast();
  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const result = await updateLarryMcDonaldAppointment();
      if (result.success) {
        toast({
          title: "Success",
          description: "Larry McDonald's appointment has been updated with patient intake notes."
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update Larry McDonald's appointment.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating the appointment.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  return;
};
export default UpdateLarryMcDonald;