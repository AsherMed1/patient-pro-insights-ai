
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { getStatusVariant } from '../utils';

interface StatusDisplayProps {
  status: string | null;
}

const StatusDisplay = ({ status }: StatusDisplayProps) => {
  const getDisplayStatus = () => {
    if (status && status.trim() !== '') {
      return {
        text: status,
        variant: getStatusVariant(status)
      };
    }
    return {
      text: 'No Status Set',
      variant: 'secondary' as const
    };
  };

  const displayStatus = getDisplayStatus();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
      <Badge variant={displayStatus.variant} className="text-xs w-fit">
        {displayStatus.text}
      </Badge>
    </div>
  );
};

export default StatusDisplay;
