import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { updateLarryMcDonaldAppointment } from '@/utils/updateLarryMcDonald';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

const UpdateLarryMcDonald = () => {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    setUpdating(true);
    
    try {
      const result = await updateLarryMcDonaldAppointment();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Larry McDonald's appointment has been updated with patient intake notes.",
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

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Update Larry McDonald Appointment</h3>
      <p className="text-sm text-gray-600 mb-4">
        Larry McDonald has patient intake notes in the leads table but not in his appointment record. 
        Click below to copy the notes to his appointment.
      </p>
      <Button onClick={handleUpdate} disabled={updating}>
        {updating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Updating...
          </>
        ) : (
          'Update Larry McDonald Appointment'
        )}
      </Button>
    </div>
  );
};

export default UpdateLarryMcDonald;