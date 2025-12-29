import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetTabs } from './navigation/WidgetTabs';
import { HomeView } from './home/HomeView';
import { ChatView } from './chat/ChatView';
import { TicketsView } from './tickets/TicketsView';
import { HelpView } from './help/HelpView';

export type WidgetTab = 'home' | 'chat' | 'help' | 'tickets';

interface SupportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onUnreadChange: (count: number) => void;
}

export const SupportPanel: React.FC<SupportPanelProps> = ({
  isOpen,
  onClose,
  projectName,
  onUnreadChange
}) => {
  const [activeTab, setActiveTab] = useState<WidgetTab>('home');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [startWithLiveAgent, setStartWithLiveAgent] = useState(false);

  const handleStartChat = () => {
    setStartWithLiveAgent(false);
    setActiveTab('chat');
  };

  const handleRequestLiveAgent = () => {
    setStartWithLiveAgent(true);
    setActiveTab('chat');
  };

  const handleOpenTickets = () => {
    setActiveTab('tickets');
  };

  const handleOpenHelp = () => {
    setActiveTab('help');
  };

  return (
    <div
      className={cn(
        "fixed bottom-24 right-6 z-50 w-[380px] h-[560px]",
        "bg-background border border-border rounded-2xl shadow-2xl",
        "flex flex-col overflow-hidden",
        "transition-all duration-300 ease-out origin-bottom-right",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <span className="text-sm font-bold">💬</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Support Center</h3>
            <p className="text-xs text-primary-foreground/70">We're here to help</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content - All views rendered, visibility controlled via CSS */}
      <div className="flex-1 overflow-hidden relative">
        <div className={cn("absolute inset-0 overflow-auto", activeTab !== 'home' && 'hidden')}>
          <HomeView 
            onStartChat={handleStartChat}
            onRequestLiveAgent={handleRequestLiveAgent}
            onOpenTickets={handleOpenTickets}
            onOpenHelp={handleOpenHelp}
            projectName={projectName}
          />
        </div>
        <div className={cn("absolute inset-0", activeTab !== 'chat' && 'hidden')}>
          <ChatView 
            projectName={projectName}
            conversationId={conversationId}
            onConversationChange={setConversationId}
            startWithLiveAgent={startWithLiveAgent}
            onLiveAgentModeStarted={() => setStartWithLiveAgent(false)}
          />
        </div>
        <div className={cn("absolute inset-0 overflow-auto", activeTab !== 'tickets' && 'hidden')}>
          <TicketsView projectName={projectName} />
        </div>
        <div className={cn("absolute inset-0 overflow-auto", activeTab !== 'help' && 'hidden')}>
          <HelpView projectName={projectName} />
        </div>
      </div>

      {/* Tab Navigation */}
      <WidgetTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
