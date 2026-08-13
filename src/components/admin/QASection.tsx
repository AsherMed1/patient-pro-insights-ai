import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type QASectionTone = 'ticket' | 'notes' | 'activity' | 'history' | 'neutral';

const TONES: Record<QASectionTone, { wrapper: string; header: string; title: string; bar: string }> = {
  ticket: {
    wrapper: 'border-qa-ticket/40 bg-qa-ticket/[0.04]',
    header: 'bg-qa-ticket/10 hover:bg-qa-ticket/15',
    title: 'text-qa-ticket',
    bar: 'bg-qa-ticket',
  },
  notes: {
    wrapper: 'border-qa-notes/40 bg-qa-notes/[0.05]',
    header: 'bg-qa-notes/10 hover:bg-qa-notes/15',
    title: 'text-qa-notes',
    bar: 'bg-qa-notes',
  },
  activity: {
    wrapper: 'border-qa-activity/40 bg-qa-activity/[0.04]',
    header: 'bg-qa-activity/10 hover:bg-qa-activity/15',
    title: 'text-qa-activity',
    bar: 'bg-qa-activity',
  },
  history: {
    wrapper: 'border-dashed border-qa-history/50 bg-qa-history/[0.04]',
    header: 'bg-qa-history/10 hover:bg-qa-history/15',
    title: 'text-qa-history',
    bar: 'bg-qa-history',
  },
  neutral: {
    wrapper: 'border-border bg-muted/30',
    header: 'bg-muted/60 hover:bg-muted',
    title: 'text-foreground',
    bar: 'bg-muted-foreground',
  },
};

const KEY_PREFIX = 'qa-section-open:';

export const qaSectionSetAll = (open: boolean) => {
  window.dispatchEvent(new CustomEvent('qa-section-set-all', { detail: { open } }));
};

interface QASectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: QASectionTone;
  count?: number;
  subtitle?: string;
  storageKey: string;
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

const QASection = ({
  title,
  icon: Icon,
  tone = 'neutral',
  count,
  subtitle,
  storageKey,
  defaultOpen = true,
  headerRight,
  children,
}: QASectionProps) => {
  const key = `${KEY_PREFIX}${storageKey}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === 'open') return true;
      if (stored === 'closed') return false;
    } catch {
      /* ignore */
    }
    return defaultOpen;
  });

  const persist = useCallback(
    (next: boolean) => {
      setOpen(next);
      try {
        localStorage.setItem(key, next ? 'open' : 'closed');
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { open: boolean } | undefined;
      if (detail) persist(detail.open);
    };
    window.addEventListener('qa-section-set-all', handler);
    return () => window.removeEventListener('qa-section-set-all', handler);
  }, [persist]);

  const t = TONES[tone];

  return (
    <div className={cn('relative overflow-hidden rounded-lg border', t.wrapper)}>
      <span className={cn('absolute left-0 top-0 h-full w-1', t.bar)} aria-hidden />
      <button
        type="button"
        onClick={() => persist(!open)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 pl-4 text-left transition-colors',
          t.header,
        )}
      >
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform', t.title, !open && '-rotate-90')}
        />
        {Icon && <Icon className={cn('h-4 w-4 shrink-0', t.title)} />}
        <span className={cn('text-sm font-semibold', t.title)}>{title}</span>
        {typeof count === 'number' && count > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {count}
          </Badge>
        )}
        {subtitle && (
          <span className="text-xs text-muted-foreground font-normal truncate">{subtitle}</span>
        )}
        <span className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {headerRight}
        </span>
      </button>
      {open && <div className="px-3 pb-3 pt-3 pl-4">{children}</div>}
    </div>
  );
};

export default QASection;
