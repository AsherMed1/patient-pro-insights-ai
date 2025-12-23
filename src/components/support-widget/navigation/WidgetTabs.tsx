import React from 'react';
import { Home, MessageCircle, HelpCircle, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetTab } from '../SupportPanel';

interface WidgetTabsProps {
  activeTab: WidgetTab;
  onTabChange: (tab: WidgetTab) => void;
}

const tabs: { id: WidgetTab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { id: 'chat', label: 'Chat', icon: <MessageCircle className="h-5 w-5" /> },
  { id: 'help', label: 'Help', icon: <HelpCircle className="h-5 w-5" /> },
  { id: 'tickets', label: 'Tickets', icon: <Ticket className="h-5 w-5" /> },
];

export const WidgetTabs: React.FC<WidgetTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex border-t border-border bg-muted/30">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 gap-0.5",
            "transition-colors duration-200",
            activeTab === tab.id 
              ? "text-primary bg-primary/5" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          {tab.icon}
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
