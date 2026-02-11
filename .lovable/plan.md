

# Fix Sidebar Bottom Padding

## Problem
The bottom action icons (Back, Settings, Sign Out) in the side navigation are getting cut off at the bottom of the viewport. The current `pb-4` padding is insufficient.

## Fix

### File: `src/pages/ProjectPortal.tsx` (line 429)

Increase the bottom padding on the bottom icon group from `pb-4` to `pb-6`, ensuring the Sign Out icon has enough breathing room from the viewport edge.

This is a one-line className change: `pb-4` becomes `pb-6` on the bottom actions container div.

