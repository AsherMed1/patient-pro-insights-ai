Fix the "Short Notice" badge in `src/components/admin/ReviewQueue.tsx` so its text no longer overflows.

Current problem (from screenshot):
- Badge is fixed at `h-5` with `text-[10px]` and `py-0`
- Content "Short Notice · 26h" is too wide for the badge, causing the text to overflow/clipping

Changes to make:
1. Change badge height from fixed `h-5` to `h-auto min-h-5` so it can grow vertically
2. Allow text wrapping with `whitespace-normal` and `leading-tight`
3. Add horizontal padding (`px-2`) and small vertical padding (`py-0.5`) so text isn't crushed
4. Keep the orange color scheme and Zap icon
5. Optionally stack the label and time on two lines for very narrow columns (e.g., "Short Notice" on line 1, "26h" on line 2) using a flex column layout inside the badge

Verification:
- Re-render the Review Queue with a short-notice row
- Confirm the badge fully shows "Short Notice · 26h" without clipped text
- Confirm the row layout remains aligned and the badge doesn't break surrounding grid columns