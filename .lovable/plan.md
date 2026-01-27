
# Plan: Fix "Add New User" Button Causing Blank Page

## Problem Analysis

When clicking the "Add User" button in the UserManagement component, the page appears to go blank. After thorough investigation, I found the root cause:

**The loading state is shared between initial data fetching and user creation operations.**

When `createUser()` is called:
1. It sets `setLoading(true)` at line 217
2. The component's early return at lines 457-459 triggers:
   ```tsx
   if (loading) {
     return <div>Loading...</div>;
   }
   ```
3. This causes the entire UserManagement component (including the open Dialog) to unmount
4. The user sees only `<div>Loading...</div>` which appears as a "blank page"

## Solution

Separate the loading states to prevent the Dialog from being unmounted during user creation:

1. Add a dedicated `creating` state for user creation operations
2. Keep `loading` only for initial data fetch
3. The Dialog will stay open while user creation is in progress
4. Show a loading indicator on the "Create User" button instead

## Technical Changes

### File: `src/components/UserManagement.tsx`

#### Change 1: Add separate state for creating users (line ~37)

Add a new state variable:
```typescript
const [creating, setCreating] = useState(false);
```

#### Change 2: Update createUser function (lines 198-289)

Replace `setLoading(true)` and `setLoading(false)` with `setCreating(true)` and `setCreating(false)`.

#### Change 3: Update Create User button (line 551)

Add a disabled state and loading indicator when `creating` is true:
```tsx
<Button onClick={createUser} className="w-full" disabled={creating}>
  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
  Create User
</Button>
```

#### Change 4: Import Loader2 (if not already imported)

Ensure `Loader2` is imported from `lucide-react`.

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/UserManagement.tsx` | Add `creating` state, update `createUser()` to use it, show loading on button |

## Expected Outcome

After implementation:
- Clicking "Add User" opens the dialog normally
- The dialog stays open during user creation
- The "Create User" button shows a spinner while processing
- The dialog closes only after successful creation
- No more "blank page" issue
