# Fix HEIC handling for extension-less GHL download links

## Root cause
Donna Zarn's card links are `https://services.leadconnectorhq.com/documents/download/<id>` — there is no `.heic` in the URL. All current HEIC logic detects HEIC by file extension, so:
- `openHeicAwareUrl` treats them as non-HEIC and opens the raw URL → GHL forces a download
- inline previews render the raw HEIC bytes → broken image

Detection must be based on file **content**, not the URL. Also, the browser can't fetch GHL URLs directly (CORS), so a small backend proxy is needed.

## Plan

1. **New edge function `fetch-insurance-image`**
   - Accepts a `url` param (only allows `services.leadconnectorhq.com`, `storage.googleapis.com`, and our own Supabase storage hosts).
   - Fetches the file server-side and streams the bytes back with permissive CORS headers and the detected content type.

2. **Rework `src/hooks/useHeicUrl.tsx` to content-based detection**
   - Fetch the image bytes (via the proxy for cross-origin hosts, directly for same-origin/Supabase storage).
   - Sniff magic bytes (`ftypheic`/`ftypheif`/`ftypmif1`) to detect HEIC regardless of URL.
   - HEIC → convert with `heic2any` to JPEG blob URL; other images → blob URL with correct MIME type.
   - Both `useHeicUrl` (inline previews) and `openHeicAwareUrl` (new-tab buttons) use this resolved blob URL, so previews render and "Full Size"/"View Insurance Card" open a viewable image instead of downloading.
   - Keep the existing session cache and "Converting…" placeholder tab.

3. **No component changes needed** — `InsuranceViewModal` and `ParsedIntakeInfo` already route through the hook/helper.

4. **Verify with Playwright** on Donna Zarn's record: preview thumbnails render, and both buttons open a tab showing the image (no download).
