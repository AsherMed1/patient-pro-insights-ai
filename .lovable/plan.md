

# Hide Delete/Trash Button on Project Cards

## Overview

Remove the trash icon button from project cards to prevent accidental project deletion. The delete functionality will be removed from the UI entirely.

## Change

**File: `src/components/projects/ProjectCard.tsx`**

Remove the `DeleteProjectDialog` import and the conditional block (around lines 123-127) that renders the trash icon for admin users:

```tsx
// Remove this block:
{isAdmin() && (
  <DeleteProjectDialog
    project={project}
    onDelete={onDelete}
  />
)}
```

Also remove the unused imports: `DeleteProjectDialog`, `useRole`, and `Trash2` (if no longer referenced elsewhere). The `onDelete` prop can remain in the interface for now to avoid breaking the parent component.

