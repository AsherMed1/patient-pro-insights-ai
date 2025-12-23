import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupportLauncherProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount: number;
}

export const SupportLauncher: React.FC<SupportLauncherProps> = ({ 
  isOpen, 
  onClick, 
  unreadCount 
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center justify-center",
        "w-14 h-14 rounded-full shadow-lg transition-all duration-300",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "hover:scale-110 active:scale-95",
        isOpen && "rotate-90"
      )}
      aria-label={isOpen ? "Close support chat" : "Open support chat"}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <>
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </>
      )}
    </button>
  );
};
