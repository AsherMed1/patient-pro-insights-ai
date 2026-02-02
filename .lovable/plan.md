

# Plan: Fix User Management Screen Refresh Loop

## Problem

Clicking "Add User" or performing any user operation causes the screen to refresh and enter a looping state. This happens because:

1. The `loading` state is shared across multiple operations
2. When `loading` is `true`, the entire component unmounts (`return <div>Loading...</div>`)
3. This closes dialogs, loses state, and causes visual "refreshing"

## Solution

Replace the global `loading` state that unmounts the component with operation-specific loading states that keep the UI intact while showing feedback.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/UserManagement.tsx` | Replace global loading pattern with operation-specific states |

---

## Implementation Details

### 1. Add Operation-Specific Loading States

Replace the single `loading` state with separate states for each operation:

```typescript
// Current (problematic)
const [loading, setLoading] = useState(true);

// Fixed (operation-specific)
const [initialLoading, setInitialLoading] = useState(true);  // Only for first data fetch
const [updating, setUpdating] = useState(false);             // For update operations
const [deleting, setDeleting] = useState(false);             // For delete operations
const [resending, setResending] = useState(false);           // For resend email
```

### 2. Update the Early Return Check

Only show loading screen during initial data fetch:

```typescript
// Current (causes refresh loop)
if (loading) {
  return <div>Loading...</div>;
}

// Fixed (only for initial load)
if (initialLoading) {
  return <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <span className="ml-2">Loading users...</span>
  </div>;
}
```

### 3. Update `fetchUsers` Function

```typescript
const fetchUsers = async (showRefreshIndicator = false) => {
  if (showRefreshIndicator) {
    setRefreshing(true);
  }
  // ... existing logic ...
  setInitialLoading(false);  // Instead of setLoading(false)
};
```

### 4. Update `updateUser` Function

```typescript
const updateUser = async () => {
  if (!editingUser) return;

  setUpdating(true);  // Use operation-specific state
  try {
    // ... existing logic ...
  } catch (error) {
    // ... error handling ...
  } finally {
    setUpdating(false);  // Reset operation-specific state
  }
};
```

### 5. Update `deleteUser` Function

```typescript
const deleteUser = async () => {
  if (!deletingUser) return;

  setDeleting(true);  // Use operation-specific state
  try {
    // ... existing logic ...
  } catch (error) {
    // ... error handling ...
  } finally {
    setDeleting(false);  // Reset operation-specific state
  }
};
```

### 6. Update `resendWelcomeEmail` Function

```typescript
const resendWelcomeEmail = async (user: User) => {
  setResending(true);  // Use operation-specific state
  try {
    // ... existing logic ...
  } catch (error) {
    // ... error handling ...
  } finally {
    setResending(false);  // Reset operation-specific state
  }
};
```

### 7. Update Dialog Buttons to Show Loading States

For the Edit dialog:
```tsx
<Button onClick={updateUser} className="w-full" disabled={updating}>
  {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
  {updating ? 'Saving...' : 'Save Changes'}
</Button>
```

For the Delete dialog:
```tsx
<Button onClick={deleteUser} variant="destructive" disabled={deleting}>
  {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
  {deleting ? 'Deleting...' : 'Delete User'}
</Button>
```

---

## Why This Fixes the Issue

| Before | After |
|--------|-------|
| Single `loading` state unmounts entire component | Operation-specific states keep component mounted |
| Dialog closes when operation starts | Dialog stays open with loading indicator |
| User loses visual context | User sees clear progress feedback |
| Screen appears to "loop" | Smooth, expected UI behavior |

---

## Additional Improvement: Add Global Error Handler

Add an unhandled promise rejection handler in `App.tsx` as a safety net:

```typescript
useEffect(() => {
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error("Unhandled rejection:", event.reason);
    toast.error("An error occurred. Please try again.");
    event.preventDefault();
  };

  window.addEventListener("unhandledrejection", handleRejection);
  return () => window.removeEventListener("unhandledrejection", handleRejection);
}, []);
```

---

## Summary

This is a known React anti-pattern where using a loading state that unmounts components causes UX issues. The fix follows the pattern already correctly implemented for the `creating` state (line 39) - just needs to be extended to all other operations.

