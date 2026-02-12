

# Replace Settings/Sign Out with Icon-Only Dropdown

## Change

Replace the separate "Settings" and "Sign Out" buttons with a single icon-only trigger (gear icon) that reveals a dropdown menu on hover containing both options. No border on the icon button.

### File: `src/pages/Index.tsx`

1. Import `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger` from `@/components/ui/dropdown-menu`
2. Remove the two separate buttons (Settings + Sign Out)
3. Replace with a `DropdownMenu` using a borderless icon-only trigger (`variant="ghost" size="icon"`) showing a `Settings` (gear) icon
4. The dropdown contains two items:
   - **Settings** (with Settings icon) -- navigates to `/settings`
   - **Sign Out** (with LogOut icon) -- calls `handleSignOut()`

### Resulting header layout

```
[Logo] Patient Pro Client Portal    email (role)  [gear icon]
                                                      |
                                                  (on hover)
                                                  Settings
                                                  Sign Out
```

