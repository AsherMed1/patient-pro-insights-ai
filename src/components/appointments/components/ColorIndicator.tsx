
import React, { useState } from 'react';
import { Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ColorIndicatorProps {
  appointmentId: string;
  initialColor?: string | null;
}

const colors = [
  { name: 'none', value: null, class: 'text-gray-300' },
  { name: 'yellow', value: 'yellow', class: 'text-yellow-500' },
  { name: 'green', value: 'green', class: 'text-green-500' },
  { name: 'red', value: 'red', class: 'text-red-500' }
];

const ColorIndicator = ({ appointmentId, initialColor }: ColorIndicatorProps) => {
  const [currentColor, setCurrentColor] = useState(initialColor);
  const { toast } = useToast();

  const getCurrentColorIndex = () => {
    return colors.findIndex(color => color.value === currentColor);
  };

  const handleColorChange = async () => {
    const currentIndex = getCurrentColorIndex();
    const nextIndex = (currentIndex + 1) % colors.length;
    const nextColor = colors[nextIndex];

    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({ color_indicator: nextColor.value })
        .eq('id', appointmentId);

      if (error) throw error;

      setCurrentColor(nextColor.value);
      
      if (nextColor.value) {
        toast({
          title: "Color Updated",
          description: `Card color set to ${nextColor.name}`,
        });
      } else {
        toast({
          title: "Color Cleared",
          description: "Card color indicator removed",
        });
      }
    } catch (error) {
      console.error('Error updating color indicator:', error);
      toast({
        title: "Error",
        description: "Failed to update color indicator",
        variant: "destructive",
      });
    }
  };

  const currentColorConfig = colors[getCurrentColorIndex()];

  return (
    <button
      onClick={handleColorChange}
      className="flex-shrink-0 hover:scale-110 transition-transform"
      title={`Click to change color (current: ${currentColorConfig.name})`}
    >
      <Circle 
        className={`h-4 w-4 ${currentColorConfig.class} ${currentColor ? 'fill-current' : ''}`}
      />
    </button>
  );
};

export default ColorIndicator;
