
# Fix: GHL Link Not Showing for Priscilla Garrett (and Similar Cases)

## Root Cause Identified

Priscilla Garrett's appointment has:
- `ghl_id`: `AheTR1tYXy7lBbKcNrEU` ✅ (present)
- `ghl_location_id`: `null` ❌ (missing on the record)
- Project `ghl_location_id`: `VUmKpmdD5cOoSIG1jOSQ` ✅ (exists in `projects` table)

The `projectLocationMap` fallback was added to `AppointmentCard`, which uses:
```tsx
appointment.ghl_location_id || projectLocationMap?.[appointment.project_name]
```

However, **`projectLocationMap` is initialized as `{}`** (empty object) and populated asynchronously. The problem is that `{}` in JavaScript is a **new object reference on every render**, so React may not correctly detect when the map is actually populated — causing cards to not re-render when the map fills in. Additionally, a `{}` reference is always truthy, so it passes conditional checks but lookups return `undefined` until populated.

There are also **two separate code paths** where the link renders:
1. **List view cards** (`AppointmentCard.tsx`) — relies on `projectLocationMap` prop from `AllAppointmentsManager`
2. **Detailed view modal** (`DetailedAppointmentView.tsx`) — does its own async fetch of `ghl_location_id`

Both paths need to be reliable.

## Fix Plan

### Fix 1: Make `projectLocationMap` state initialization null-safe in `AllAppointmentsManager.tsx`

Change the initial state from `{}` to `null`, and only pass it down once it's been populated. This ensures cards don't render with a stale empty map.

```tsx
// Before
const [projectLocationMap, setProjectLocationMap] = useState<Record<string, string>>({});

// After
const [projectLocationMap, setProjectLocationMap] = useState<Record<string, string> | null>(null);
```

Then wait to pass it down until it's populated (pass `{}` as fallback only after the fetch succeeds).

### Fix 2: Improve `AppointmentCard.tsx` GHL link condition

The current condition only shows the link if the `projectLocationMap` prop has an entry. Make it more robust by also triggering a direct DB lookup on the card level if both the prop map and the appointment field are missing the location ID.

Actually, a simpler and more reliable fix: since `AppointmentCard` **already** fetches project credentials (including `ghl_location_id`) from the database for the calendar dropdown feature (lines 260-270 in `AppointmentCard.tsx`), we can **reuse `projectGhlCredentials.ghl_location_id`** as another fallback source.

```tsx
// AppointmentCard already has this state from the calendar feature:
const [projectGhlCredentials, setProjectGhlCredentials] = useState<{ 
  ghl_location_id: string | null; 
  ghl_api_key: string | null 
}>({ ghl_location_id: null, ghl_api_key: null });
```

But this only populates when the calendar dropdown is opened — not on initial render.

### Correct Fix: Add a `useEffect` in `AppointmentCard` to fetch location ID on mount

Add a small `useEffect` in `AppointmentCard` that fetches `ghl_location_id` from the `projects` table **on mount** (when `appointment.ghl_location_id` is null), storing it in a local state variable `fetchedLocationId`. Use this as a third-tier fallback:

```tsx
const [fetchedLocationId, setFetchedLocationId] = useState<string | null>(null);

useEffect(() => {
  if (!appointment.ghl_location_id && !projectLocationMap?.[appointment.project_name]) {
    supabase
      .from('projects')
      .select('ghl_location_id')
      .eq('project_name', appointment.project_name)
      .single()
      .then(({ data }) => {
        if (data?.ghl_location_id) setFetchedLocationId(data.ghl_location_id);
      });
  }
}, [appointment.id, appointment.ghl_location_id, appointment.project_name]);

const effectiveLocationId = 
  appointment.ghl_location_id || 
  projectLocationMap?.[appointment.project_name] || 
  fetchedLocationId;
```

Then use `effectiveLocationId` for the link.

This mirrors what `DetailedAppointmentView` already does successfully — and makes the card self-sufficient regardless of whether the parent `projectLocationMap` is available.

## Files Changed

### `src/components/appointments/AppointmentCard.tsx`

1. Add `fetchedLocationId` state (initialized to `null`).
2. Add a `useEffect` that runs on mount: if `appointment.ghl_location_id` is null AND `projectLocationMap` doesn't have the entry, fetch from `projects` table.
3. Define `effectiveLocationId` using the three-tier fallback.
4. Replace `(appointment.ghl_location_id || projectLocationMap?.[appointment.project_name])` with `effectiveLocationId` in both the condition and the URL.

This is the only file that needs changing — `DetailedAppointmentView.tsx` already has self-sufficient fallback logic that should work correctly.

## Why This Is Reliable

- Self-contained: each card fetches its own fallback if needed — no dependency on parent timing
- The query is tiny (single row by project_name) and fast
- Only runs when `ghl_location_id` is null (most new appointments will have it; only older records need the fallback)
- State updates cause a re-render that shows the link once the value is available
- Same pattern already proven to work in `DetailedAppointmentView`
