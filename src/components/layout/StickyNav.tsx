import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useStickyHeight, PORTAL_NAV_VAR } from '@/hooks/useStickyHeight';

/**
 * Sticky main navigation strip that parks itself directly under the portal
 * header and publishes its own height so page toolbars can stack beneath it.
 */
export default function StickyNav({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useStickyHeight<HTMLDivElement>(PORTAL_NAV_VAR);

  return (
    <div
      ref={ref}
      style={{ top: 'var(--portal-header-h, 0px)' }}
      className={cn(
        'sticky z-30 -mx-4 border-b bg-gray-50/95 px-4 pb-2 pt-1 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 md:-mx-6 md:px-6',
        className,
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
