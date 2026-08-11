import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Tracks whether the signed-in user has completed the clinic Portal Tour.
 *
 * Existing users were backfilled with a completion timestamp, so only accounts
 * created from now on get the tour automatically on first login. Everyone can
 * replay it from the Help menu.
 */
export const usePortalTour = (enabled: boolean) => {
  const [tourOpen, setTourOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!enabled || checked) return;
    let cancelled = false;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('portal_tour_completed_at')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;
      setChecked(true);
      if (error) return;
      if (data && !data.portal_tour_completed_at) {
        setTourOpen(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, checked]);

  const markComplete = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;
    await supabase
      .from('profiles')
      .update({ portal_tour_completed_at: new Date().toISOString() })
      .eq('id', userId);
  }, []);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    void markComplete();
  }, [markComplete]);

  const startTour = useCallback(() => setTourOpen(true), []);

  return { tourOpen, startTour, closeTour };
};
