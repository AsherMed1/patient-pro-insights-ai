

# Plan: Fix Blank Page Crash in User Management

## Root Cause

The page goes blank because of null reference errors during rendering. When a newly created user profile has a `null` value for `full_name` or `role` (due to database trigger timing), the component crashes on:

- `user.full_name.toLowerCase()` in the search filter (line 698)
- `a.full_name.localeCompare(b.full_name)` in the sort (lines 730-731)
- `getRoleBadgeVariant(user.role!)` using a non-null assertion on a potentially null value (line 742)

A single `TypeError` in the render path crashes the entire React tree, producing a blank page.

## Fix

### File: `src/components/UserManagement.tsx`

1. **Default `full_name` during data mapping** (line 146-148): Change the user formatting to default `full_name` to `email` or empty string if null:
   ```
   full_name: profile.full_name || profile.email || '',
   ```

2. **Add null safety to the search filter** (line 698): Use optional chaining:
   ```
   (user.full_name || '').toLowerCase().includes(search)
   (user.role || '').toLowerCase().includes(search)
   ```

3. **Add null safety to the sort** (lines 730-731): Use fallback values:
   ```
   (a.full_name || '').localeCompare(b.full_name || '')
   (b.full_name || '').localeCompare(a.full_name || '')
   ```

4. **Remove unsafe non-null assertion** (line 742): Change `user.role!` to `user.role || 'project_user'` to prevent crash when role is undefined.

## No Backend Changes

This is purely a defensive coding fix in one file.

