import { useEffect, useState } from "react";

// Module-level cache so re-opens are instant and multiple components share results
const cache = new Map<string, string>(); // originalUrl -> objectUrl
const inflight = new Map<string, Promise<string | null>>();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const heicByExtension = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".heic") || clean.endsWith(".heif");
};

// URLs that may point at any file type without an extension (e.g. GHL
// documents/download links) — we must fetch the bytes to know what they are.
const needsContentSniff = (url?: string | null) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.hostname === "services.leadconnectorhq.com") return true;
    if (u.hostname === "storage.googleapis.com") return true;
  } catch {
    return false;
  }
  return heicByExtension(url);
};

// Cross-origin hosts that block browser fetches — go through our proxy.
const needsProxy = (url: string) => {
  try {
    const u = new URL(url);
    if (u.hostname === "services.leadconnectorhq.com") return true;
    if (u.hostname === "storage.googleapis.com") return true;
    return false;
  } catch {
    return false;
  }
};

const proxied = (url: string) =>
  `${SUPABASE_URL}/functions/v1/fetch-insurance-image?url=${encodeURIComponent(url)}`;

function isHeicBlob(bytes: Uint8Array): boolean {
  // HEIC/HEIF magic: bytes 4-12 contain "ftyp" + brand (heic, heix, heif, mif1, msf1, hevc...)
  if (bytes.length < 12) return false;
  const ftyp = String.fromCharCode(...bytes.slice(4, 8));
  if (ftyp !== "ftyp") return false;
  const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
  return ["heic", "heix", "heif", "heim", "heis", "hevc", "hevx", "mif1", "msf1"].some((b) =>
    brand.startsWith(b.slice(0, 4))
  );
}

/**
 * Fetches the image bytes (via proxy for CORS-blocked hosts), sniffs content,
 * converts HEIC → JPEG, and returns a viewable blob URL. Cached per session.
 */
async function resolveViewableUrl(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url)!;
  if (inflight.has(url)) return inflight.get(url)!;

  const p = (async () => {
    try {
      const fetchUrl = needsProxy(url) ? proxied(url) : url;
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`fetch failed ${res.status}`);
      const blob = await res.blob();
      const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());

      let viewable: Blob;
      if (isHeicBlob(head)) {
        const heic2any = (await import("heic2any")).default;
        const out = await heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
        viewable = Array.isArray(out) ? out[0] : out;
      } else {
        // Ensure a renderable MIME type so the tab displays instead of downloads
        const type = blob.type && blob.type !== "application/octet-stream" ? blob.type : "image/jpeg";
        viewable = blob.type === type ? blob : new Blob([blob], { type });
      }

      const objectUrl = URL.createObjectURL(viewable);
      cache.set(url, objectUrl);
      return objectUrl;
    } catch (err) {
      console.error("Image resolve/HEIC conversion failed for", url, err);
      return null;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, p);
  return p;
}

/**
 * Opens a URL in a new tab, resolving/converting it first (HEIC → JPEG) so it
 * renders inline instead of downloading. Opens the tab synchronously to avoid
 * popup blockers, then navigates it once resolution completes.
 */
export function openHeicAwareUrl(url?: string | null) {
  if (!url) return;
  if (!needsContentSniff(url) && !heicByExtension(url)) {
    window.open(url, "_blank");
    return;
  }
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(
      '<title>Loading image…</title><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#666">Loading image…</body>'
    );
  }
  resolveViewableUrl(url).then((objectUrl) => {
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
 * - Plain image URLs are returned unchanged immediately.
 * - Extension-less document links (GHL) and .heic URLs are fetched, sniffed,
 *   and converted to a JPEG blob URL (cached across the session).
 */
export function useHeicUrl(url?: string | null) {
  const sniff = needsContentSniff(url);
  const [resolved, setResolved] = useState<string | null>(
    sniff ? cache.get(url!) ?? null : url ?? null
  );
  const [loading, setLoading] = useState<boolean>(sniff && !cache.has(url!));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    if (!url) {
      setResolved(null);
      setLoading(false);
      return;
    }
    if (!needsContentSniff(url)) {
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
    resolveViewableUrl(url).then((objectUrl) => {
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

  return { url: resolved, loading, failed, isHeic: sniff };
}
