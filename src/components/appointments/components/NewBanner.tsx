
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface NewBannerProps {
  appointmentId: string;
  onMarkAsViewed: () => void;
}

const NewBanner = ({ appointmentId, onMarkAsViewed }: NewBannerProps) => {
  const { toast } = useToast();

  const handleMarkAsViewed = async () => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({ is_viewed: true })
        .eq('id', appointmentId);

      if (error) throw error;

      onMarkAsViewed();
    } catch (error) {
      console.error('Error marking appointment as viewed:', error);
      toast({
        title: "Error",
        description: "Failed to mark appointment as viewed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-between mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
      <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-semibold">
        NEW
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMarkAsViewed}
        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
      >
        <Eye className="h-4 w-4" />
        <span className="text-xs">Mark as viewed</span>
      </Button>
    </div>
  );
};

export default NewBanner;
