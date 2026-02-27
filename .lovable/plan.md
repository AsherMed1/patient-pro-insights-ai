

## Add FSE (Frozen Shoulder Embolization) Event Type to Calendar

### Changes

| File | Change |
|------|--------|
| `src/components/appointments/calendarUtils.ts` | Add FSE entry to `EVENT_TYPES` array (before "Other") with a distinct color (amber/yellow — `amber-500`) and add `FSE` / `FROZEN SHOULDER` keyword matching in `getEventTypeFromCalendar()` |

### Detail

**New event type entry:**
```typescript
{
  type: 'FSE',
  shortName: 'FSE',
  borderColor: 'border-l-amber-500',
  bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  textColor: 'text-amber-700 dark:text-amber-300',
  dotColor: 'bg-amber-500'
}
```

**New parser match** (in `getEventTypeFromCalendar`, before the default return):
```typescript
if (upperName.includes('FSE') || upperName.includes('FROZEN SHOULDER')) {
  return EVENT_TYPES.find(e => e.type === 'FSE')!;
}
```

Amber is chosen to avoid conflicts with existing colors (orange=GAE, blue=PFE, teal=UFE, purple=PAE, pink=HAE, emerald=Neuropathy, indigo=Vein, red=PAD).

