

# Shrink Header Title and Add Logo

## Changes

### 1. Add logo to project assets
- Copy the uploaded logo (`Untitled_design_-_2026-02-02T175736.227.png`) to `src/assets/patient-pro-logo.png`

### 2. Update header in `src/pages/Index.tsx`
- Import the logo image
- Replace the large `heading-1` title with a compact row: logo image (h-8) + title text (`text-lg font-semibold`) + subtitle (`text-sm`)
- This brings the header in line with the compact right-side controls

### Result
- The oversized "Patient Pro Client Portal" text shrinks from `heading-1` (which renders very large) down to a standard `text-lg`
- The logo sits to the left of the text, giving it a polished branded look
- The overall header row becomes much more compact

