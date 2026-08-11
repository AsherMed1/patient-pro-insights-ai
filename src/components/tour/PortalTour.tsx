import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { PORTAL_TOUR_STEPS, PortalTourSection, PortalTourStep } from './portalTourSteps';

interface PortalTourProps {
  open: boolean;
  onClose: () => void;
  /** Called before a step that needs a different portal section is shown. */
  onNavigate: (section: PortalTourSection) => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_WIDTH = 340;
const GAP = 14;

const getRect = (anchor?: string): Rect | null => {
  if (!anchor) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

const scrollIntoView = (anchor?: string) => {
  if (!anchor) return;
  const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

export const PortalTour: React.FC<PortalTourProps> = ({ open, onClose, onNavigate }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  /** Last known anchor rect — keeps the spotlight alive (fading) between steps. */
  const lastRectRef = useRef<Rect | null>(null);

  const steps = PORTAL_TOUR_STEPS;
  const step: PortalTourStep | undefined = steps[index];

  useEffect(() => {
    if (open) {
      setIndex(0);
      setReady(false);
      lastRectRef.current = null;
    }
  }, [open]);

  // Move the portal to the section this step needs, then measure the anchor.
  // Retry for up to ~1s if the anchor is not yet in the DOM (section still
  // switching) so the spotlight never vanishes silently.
  useEffect(() => {
    if (!open || !step) return;
    setReady(false);
    if (step.section) onNavigate(step.section);

    let cancelled = false;
    const timers: number[] = [];
    let raf = 0;

    const settle = () => {
      if (cancelled) return;
      scrollIntoView(step.anchor);
      timers.push(window.setTimeout(() => {
        if (cancelled) return;
        const tryMeasure = (attemptsLeft: number) => {
          if (cancelled) return;
          const measured = getRect(step.anchor);
          if (measured) {
            lastRectRef.current = measured;
            setRect(measured);
            setReady(true);
            return;
          }
          if (attemptsLeft > 0) {
            raf = window.requestAnimationFrame(() => tryMeasure(attemptsLeft - 1));
          } else {
            // Anchor genuinely missing for this user — fade the spotlight out.
            setRect(null);
            setReady(true);
          }
        };
        tryMeasure(60); // ~1s at 60fps
      }, 320));
    };

    timers.push(window.setTimeout(settle, step.section ? 220 : 40));

    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
      if (raf) window.cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  // Keep the spotlight aligned while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!open || !ready || !step?.anchor) return;
    const update = () => {
      const measured = getRect(step.anchor);
      if (measured) {
        lastRectRef.current = measured;
        setRect(measured);
      }
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, ready, step?.anchor]);

  const next = useCallback(() => {
    setIndex(i => (i >= steps.length - 1 ? i : i + 1));
  }, [steps.length]);

  const back = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  const finish = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, back, finish]);

  const cardStyle = useMemo<React.CSSProperties>(() => {
    if (!rect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: CARD_WIDTH,
      };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const placement = step?.placement ?? 'bottom';

    let top = rect.top + rect.height + GAP;
    let left = rect.left;

    if (placement === 'top') top = rect.top - GAP - 200;
    if (placement === 'right') {
      top = rect.top;
      left = rect.left + rect.width + GAP;
    }
    if (placement === 'left') {
      top = rect.top;
      left = rect.left - CARD_WIDTH - GAP;
    }

    // Keep the card fully on screen.
    left = Math.min(Math.max(12, left), vw - CARD_WIDTH - 12);
    top = Math.min(Math.max(12, top), vh - 220);

    return { top, left, width: CARD_WIDTH };
  }, [rect, step?.placement]);

  if (!open || !step) return null;

  const isLast = index === steps.length - 1;

  // The spotlight keeps the last known rect so it can fade in place instead
  // of popping when a step has no anchor (or while the next anchor renders).
  const spotRect = rect ?? lastRectRef.current;
  const spotVisible = !!rect;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Base scrim — fades out when a spotlight is active (the spotlight's
          boxShadow takes over the dimming), fades in for centered steps. */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 ease-out"
        style={{ background: 'hsl(var(--foreground) / 0.55)', opacity: spotVisible ? 0 : 1 }}
      />

      {/* Spotlight — always mounted, morphs between anchors and fades out
          gracefully when there is no anchor for the current step. */}
      {spotRect && (
        <div
          className="absolute rounded-lg ring-2 ring-primary pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: spotRect.top - 6,
            left: spotRect.left - 6,
            width: spotRect.width + 12,
            height: spotRect.height + 12,
            boxShadow: '0 0 0 9999px hsl(var(--foreground) / 0.55)',
            opacity: spotVisible ? 1 : 0,
          }}
        />
      )}

      {/* Click-catcher so the underlying UI stays untouched during the tour */}
      <div className="absolute inset-0" onClick={() => { /* block clicks */ }} />

      <div
        className="absolute rounded-xl border border-border bg-background p-4 shadow-2xl animate-fade-in transition-[top,left,width] duration-300 ease-out"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Step {index + 1} of {steps.length}
            </p>
            {/* Cross-fade the per-step text so it doesn't snap when the
                step changes while the card itself glides to its new spot. */}
            <div key={index} className="animate-fade-in">
              <h3 className="mt-1 text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1" onClick={finish} aria-label="Close tour">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={finish} className="text-xs text-muted-foreground hover:text-foreground">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button variant="outline" size="sm" onClick={back}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={isLast ? finish : next}>
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ArrowRight className="ml-1 h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PortalTour;
