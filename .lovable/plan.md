# Fix remaining HEIC auto-download paths

## Problem
The previous fix converts HEIC only for inline previews via `useHeicUrl`. Several buttons still call `window.open(rawUrl)` with the original `.heic` link, so the browser downloads it:

- `src/components/appointments/ParsedIntakeInfo.tsx` line 740 — "View Insurance Card" button
- `src/components/appointments/ParsedIntakeInfo.tsx` line 835 — secondary card "Full Size"
- `src/components/InsuranceViewModal.tsx` line 158 — "View Insurance Details" button
- `src/components/InsuranceViewModal.tsx` line 59 — "Full Size" can fire before conversion finishes (falls back to raw URL)

## Fix

1. **Add `openHeicAwareUrl(url)` helper to `src/hooks/useHeicUrl.tsx`**
   - Opens a blank tab synchronously (avoids popup blockers), then:
   - Non-HEIC → navigate tab to the URL immediately.
   - HEIC → reuse the existing convert/cache logic, then point the tab at the converted JPEG blob URL. On failure, fall back to the original URL.

2. **Update all click handlers to use the helper**
   - `ParsedIntakeInfo.tsx`: both `window.open` calls (lines 740, 835).
   - `InsuranceViewModal.tsx`: "View Insurance Details" (line 158) and "Full Size" (line 59) — Full Size will also wait for the in-flight conversion instead of falling back to the raw URL while loading.

3. **Verify** with Playwright against Donna Zarn's record: click View Insurance Card and Full Size, confirm the tab shows an image instead of triggering a download.

No backend or data changes needed.