## Goal
Restyle the Insurance Card Photos block inside the Insurance Information modal so the Front and Back images are shown side-by-side using the same layout as the Insurance Card Upload component (matching label style, image sizing, and side-by-side flex layout).

## Changes

### `src/components/InsuranceViewModal.tsx`
Update the `CardPhotos` subcomponent (used for both Primary and Secondary):

- Replace the dashed gray container + small "INSURANCE CARD PHOTOS" header with the styling used in `InsuranceCardUpload`:
  - Wrap in a `Card` with the green gradient (`bg-gradient-to-br from-green-50 to-emerald-50 border-green-200`).
  - Header row: `Upload` (or `FileText`) icon + "Insurance Card" title in green-900.
  - Two equal-width columns via `flex gap-4` (instead of `grid grid-cols-2`).
- For each side:
  - Label "Front of Card" / "Back of Card" in `text-xs font-medium text-muted-foreground mb-2` (matching upload UI).
  - Image rendered at `w-full h-32 object-cover rounded-lg border border-border` (same dimensions as upload preview).
  - Keep the existing "Full Size" button below each image so users can still open the original.
- If only one side is uploaded, show the empty side as an empty placeholder box (dashed border, "No image" text) so the layout stays symmetric — same visual rhythm as the upload component.
- For the Secondary card section, reuse the same `CardPhotos` component but with a teal/emerald header tint to differentiate (matches `SecondaryInsuranceCardUpload` styling: `from-emerald-50 to-teal-50 border-emerald-200`). Pass an optional `variant: 'primary' | 'secondary'` prop.

No other files change. Data wiring and the NVVI Test URL swap from the previous turn remain as-is.
