import { useEffect, useRef } from 'react';

/**
 * Interval that pauses while the browser tab is hidden and runs a catch-up
 * refresh when the tab becomes visible again. Keeps background tabs from
 * hammering the database.
 */
export const useVisibilityPolling = (
  callback: () => void,
  intervalMs: number,
  enabled: boolean = true
) => {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      cbRef.current();
    };

    const id = setInterval(tick, intervalMs);

    const onVisible = () => {
      if (!document.hidden) cbRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, enabled]);
};
