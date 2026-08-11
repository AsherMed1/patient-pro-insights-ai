import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { HelpCircle, PlayCircle, Compass } from 'lucide-react';
import { VideoGallery } from '@/components/support-widget/help/VideoGallery';

interface PortalHelpMenuProps {
  projectName: string;
  onStartTour: () => void;
}

/** Single Help entry point for clinic portal users: guided tour + training videos. */
export const PortalHelpMenu: React.FC<PortalHelpMenuProps> = ({ projectName, onStartTour }) => {
  const [videosOpen, setVideosOpen] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <>
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
          <DropdownMenuLabel>Help &amp; training</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onStartTour}>
            <Compass className="mr-2 h-4 w-4" />
            Portal Tour
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setVideosOpen(true)}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Training videos
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={videosOpen} onOpenChange={setVideosOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Training videos</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <VideoGallery searchQuery={search} projectName={projectName} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PortalHelpMenu;
