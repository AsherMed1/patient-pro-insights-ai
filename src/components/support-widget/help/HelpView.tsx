import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAQList } from './FAQList';
import { VideoGallery } from './VideoGallery';

type HelpTab = 'faq' | 'videos';

interface HelpViewProps {
  projectName: string;
}

export const HelpView: React.FC<HelpViewProps> = ({ projectName }) => {
  const [activeTab, setActiveTab] = useState<HelpTab>('faq');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-full">
      {/* Header with Search */}
      <div className="p-4 border-b border-border space-y-3">
        <h2 className="font-semibold text-foreground">Help Center</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            className={cn(
              "w-full pl-9 pr-3 py-2 text-sm rounded-lg",
              "bg-muted border border-transparent",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background"
            )}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('faq')}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
              activeTab === 'faq'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            FAQs
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
              activeTab === 'videos'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Videos
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'faq' ? (
          <FAQList searchQuery={searchQuery} projectName={projectName} />
        ) : (
          <VideoGallery searchQuery={searchQuery} projectName={projectName} />
        )}
      </div>
    </div>
  );
};
