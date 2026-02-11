

# Make Header Sticky on Scroll

## What Changes
Make the project header bar (project name + action icons) stick to the top of the viewport when scrolling, so it remains visible at all times.

## Technical Details

### File: `src/pages/ProjectPortal.tsx` (lines 373-392)

1. Extract the header out of the padded content container so it can span the full viewport width when sticky
2. Add `sticky top-0 z-50 bg-background` to the header wrapper so it pins to the top on scroll
3. Add horizontal padding matching the page (`px-4 md:px-6 lg:px-8`) and constrain inner content with `max-w-7xl mx-auto`
4. Add a subtle bottom border or backdrop blur (`backdrop-blur-sm border-b border-border/20`) for visual separation when scrolled

Result: The header with project name, back arrow, settings, and sign-out icons stays fixed at the top while the rest of the page scrolls beneath it.

