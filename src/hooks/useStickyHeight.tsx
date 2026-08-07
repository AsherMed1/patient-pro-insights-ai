import { useEffect, useRef } from 'react';

/**
 * Measures an element and publishes its height as a CSS variable on
 * `document.documentElement`, so sticky elements further down the page can
 * offset themselves without hardcoded pixel values (the header/nav can wrap
 * on narrow screens).
 *
 * Usage: `const ref = useStickyHeight('--portal-header-h');`
 */
export function useStickyHeight<T extends HTMLElement = HTMLDivElement>(cssVar: string) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el) {
      root.style.setProperty(cssVar, '0px');
      return;
    }

    const apply = () => root.style.setProperty(cssVar, `${Math.round(el.getBoundingClientRect().height)}px`);
    apply();

    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
      root.style.setProperty(cssVar, '0px');
    };
  }, [cssVar]);

  return ref;
}

export const PORTAL_HEADER_VAR = '--portal-header-h';
export const PORTAL_NAV_VAR = '--portal-nav-h';
