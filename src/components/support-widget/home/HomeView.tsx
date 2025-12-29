import React from 'react';
import { MessageCircle, Ticket, HelpCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeViewProps {
  onStartChat: () => void;
  onRequestLiveAgent: () => void;
  onOpenTickets: () => void;
  onOpenHelp: () => void;
  projectName: string;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartChat,
  onRequestLiveAgent,
  onOpenTickets,
  onOpenHelp,
  projectName
}) => {
  const quickActions = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: 'Chat with AI',
      description: 'Get instant answers from our AI assistant',
      onClick: onStartChat,
      gradient: 'from-violet-500 to-purple-600',
      comingSoon: false,
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: 'Live Support',
      description: 'Talk to our support team',
      onClick: onRequestLiveAgent,
      gradient: 'from-blue-500 to-cyan-600',
      comingSoon: false,
    },
    {
      icon: <Ticket className="h-6 w-6" />,
      title: 'Submit Ticket',
      description: 'Create a support request',
      onClick: onOpenTickets,
      gradient: 'from-orange-500 to-amber-600',
      comingSoon: true,
    },
    {
      icon: <HelpCircle className="h-6 w-6" />,
      title: 'Help Center',
      description: 'Browse FAQs & tutorials',
      onClick: onOpenHelp,
      gradient: 'from-emerald-500 to-teal-600',
      comingSoon: false,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      {/* Welcome Message */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-foreground mb-1">
          Hi there! 👋
        </h2>
        <p className="text-sm text-muted-foreground">
          How can we help you today?
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={action.comingSoon ? undefined : action.onClick}
            disabled={action.comingSoon}
            className={cn(
              "relative flex flex-col items-center p-4 rounded-xl",
              "bg-card border border-border",
              "transition-all duration-200 text-left group",
              action.comingSoon 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
            )}
          >
            {action.comingSoon && (
              <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-semibold bg-muted text-muted-foreground rounded-full">
                Coming Soon
              </span>
            )}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center mb-2",
              "bg-gradient-to-br text-white",
              action.gradient,
              action.comingSoon && "grayscale"
            )}>
              {action.icon}
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-0.5">
              {action.title}
            </h3>
            <p className="text-[11px] text-muted-foreground text-center leading-tight">
              {action.description}
            </p>
          </button>
        ))}
      </div>

      {/* Recent Conversations Preview */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Popular Questions
        </h3>
        <div className="space-y-2">
          {[
            'How do I update an appointment status?',
            'What do the different statuses mean?',
            'How do I filter appointments?'
          ].map((question, index) => (
            <button
              key={index}
              onClick={onStartChat}
              className="w-full text-left px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
