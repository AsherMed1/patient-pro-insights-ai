

# Separate Settings and Sign Out into Individual Icon Buttons

## Change

Replace the dropdown menu with two separate borderless icon-only buttons side by side in the header.

### File: `src/pages/Index.tsx`

1. Remove the `DropdownMenu` wrapper and its imports
2. Replace with two individual `Button` components:
   - **Settings** (gear icon) - `variant="ghost" size="icon"`, navigates to `/settings`
   - **Sign Out** (LogOut icon) - `variant="ghost" size="icon"`, calls `handleSignOut()`
3. Both buttons: no border, icon-only (`h-9 w-9`)

### Resulting header layout

```text
[Logo] Patient Pro Client Portal    email (role)  [gear]  [logout]
```

### Code

```tsx
<Button variant="ghost" size="icon" className="h-9 w-9 border-none" onClick={() => navigate('/settings')}>
  <Settings className="h-5 w-5" />
</Button>
<Button variant="ghost" size="icon" className="h-9 w-9 border-none" onClick={handleSignOut}>
  <LogOut className="h-5 w-5" />
</Button>
```

