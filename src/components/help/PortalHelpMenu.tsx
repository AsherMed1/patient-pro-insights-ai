import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HelpCircle, Compass } from 'lucide-react';

interface PortalHelpMenuProps {
  onStartTour: () => void;
}

/** Single Help entry point for clinic portal users: guided tour. */
export const PortalHelpMenu: React.FC<PortalHelpMenuProps> = ({ onStartTour }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          data-tour="help-menu"
        >
          <HelpCircle className="h-4 w-4" />
          Help
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover z-[60]">
        <DropdownMenuLabel>Help</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onStartTour}>
          <Compass className="mr-2 h-4 w-4" />
          Portal Tour
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PortalHelpMenu;
