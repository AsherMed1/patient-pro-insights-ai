

## Remove Duplicate Long-Form Location Names for Apex Vascular

### Problem
Calendar names like `"Request your GAE Consultation at Apex Vascular - Crossville"` produce the location `"Apex Vascular - Crossville"` via the `at` regex, while `"Request your GAE Consultation at Crossville"` produces just `"Crossville"`. Both appear in the legend, creating duplicates.

### Fix
In the `extractLocationFromCalendarName` function in `src/components/appointments/LocationLegend.tsx`, update the `at` regex match to strip a leading project/clinic prefix before the dash. If the extracted location contains ` - `, take only the part after the dash.

### Single file change

| File | Change |
|------|--------|
| `src/components/appointments/LocationLegend.tsx` | In the `atMatch` branch (~line 21-23), after extracting the location, check if it contains ` - ` and if so, take only the substring after the last ` - `. This collapses `"Apex Vascular - Crossville"` to `"Crossville"`. |

```typescript
// Current:
const loc = atMatch[1].trim().replace(/,\s*[A-Z]{2}$/, '');
return loc;

// Updated:
let loc = atMatch[1].trim().replace(/,\s*[A-Z]{2}$/, '');
const dashIdx = loc.lastIndexOf(' - ');
if (dashIdx !== -1) {
  loc = loc.substring(dashIdx + 3).trim();
}
return loc;
```

This ensures only the short location names (Crossville, Decatur, Lenoir City, etc.) appear in the legend, eliminating the "Apex Vascular - X" duplicates.

