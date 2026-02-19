

# Adjust Neuropathy Event Color to Distinguish from GAE

## Problem
GAE uses **orange** and Neuropathy uses **amber** -- these are nearly identical warm yellow-orange tones, making them hard to distinguish on the calendar.

## Solution
Change Neuropathy from amber to **emerald/green**, which provides strong contrast against GAE's orange and doesn't conflict with any other event type color.

## Changes

### File: `src/components/appointments/calendarUtils.ts`

Update the Neuropathy entry in the `EVENT_TYPES` array:

```
// Before (amber - too similar to orange/GAE)
type: 'Neuropathy',
borderColor: 'border-l-amber-500',
bgColor: 'bg-amber-50 dark:bg-amber-950/30',
textColor: 'text-amber-700 dark:text-amber-300',
dotColor: 'bg-amber-500'

// After (emerald - distinct green)
type: 'Neuropathy',
borderColor: 'border-l-emerald-500',
bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
textColor: 'text-emerald-700 dark:text-emerald-300',
dotColor: 'bg-emerald-500'
```

This is a single-file, cosmetic change. No other files or deployments are affected.

