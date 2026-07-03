import { useEffect, useState } from "react";

// Module-level cache so re-opens are instant and multiple components share results
const cache = new Map<string, string>(); // originalUrl -> objectUrl
const inflight = new Map<string, Promise<string | null>>();

const isHeic = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".heic") || clean.endsWith(".heif");
};

async function convert(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url)!;
  if (inflight.has(url)) return inflight.get(url)!;

  const p = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fetch failed ${res.status}`);
      const blob = await res.blob();
      const heic2any = (await import("heic2any")).default;
      const out = await heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
      const jpeg = Array.isArray(out) ? out[0] : out;
      const objectUrl = URL.createObjectURL(jpeg);
      cache.set(url, objectUrl);
      return objectUrl;
    } catch (err) {
      console.error("HEIC conversion failed for", url, err);
      return null;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, p);
  return p;
}

/**
 * Opens a URL in a new tab, converting HEIC to JPEG first so it renders
 * inline instead of downloading. Opens the tab synchronously to avoid
 * popup blockers, then navigates it once conversion resolves.
 */
export function openHeicAwareUrl(url?: string | null) {
  if (!url) return;
  if (!isHeic(url)) {
    window.open(url, "_blank");
    return;
  }
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(
      '<title>Converting image…</title><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#666">Converting HEIC image…</body>'
    );
  }
  convert(url).then((objectUrl) => {
    const target = objectUrl || url;
    if (win) {
      win.location.href = target;
    } else {
      window.open(target, "_blank");
    }
  });
}

/**
 * Returns a browser-viewable URL for a possibly-HEIC image URL.
 * - If the URL isn't HEIC, returns it unchanged immediately.
 * - If HEIC, fetches + converts to JPEG blob URL (cached across the session).
 * - `loading` is true only while converting; `failed` = conversion errored (falls back to original).
 */
export function useHeicUrl(url?: string | null) {
  const heic = isHeic(url);
  const [resolved, setResolved] = useState<string | null>(
    heic ? cache.get(url!) ?? null : url ?? null
  );
  const [loading, setLoading] = useState<boolean>(heic && !cache.has(url!));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    if (!url) {
      setResolved(null);
      setLoading(false);
      return;
    }
    if (!isHeic(url)) {
      setResolved(url);
      setLoading(false);
      return;
    }
    if (cache.has(url)) {
      setResolved(cache.get(url)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    convert(url).then((objectUrl) => {
      if (cancelled) return;
      if (objectUrl) {
        setResolved(objectUrl);
      } else {
        setResolved(url); // fall back to original
        setFailed(true);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [url]);

  return { url: resolved, loading, failed, isHeic: heic };
}
