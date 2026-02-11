

# Plan: Fix Page Blank/Refresh Issue When Adding a User

## Root Cause Analysis

After reviewing the code, I identified several issues that contribute to the blank page behavior:

1. **Unnecessary toast on every data fetch**: The `fetchUsers` function (line 174) fires a "Users Refreshed" toast on EVERY call -- including initial page load and after creating/updating/deleting users. This causes duplicate toasts (a "Success" toast AND a "Users Refreshed" toast) and may trigger re-renders that disrupt the UI.

2. **Missing `DialogDescription`**: All four Dialog components (Create, Edit, Delete, Reset Password) are missing the required `DialogDescription` component, causing Radix UI warnings that can lead to unexpected behavior in some browsers.

3. **No guard against re-fetch timing**: After creating a user, `fetchUsers(true)` is called immediately. If there's any timing issue with the database triggers (profile creation via `handle_new_user`), it could return incomplete data causing render issues.

## Changes

### File: `src/components/UserManagement.tsx`

1. **Split the toast out of `fetchUsers`** -- Only show the "Users Refreshed" toast when the function is called from the manual Refresh button (add a `showToast` parameter), NOT when called internally after create/update/delete or on initial mount.

2. **Add `DialogDescription`** to all four Dialog components (Create User, Edit User, Delete User, Reset Password, Generated Password) to fix the Radix UI accessibility warnings and prevent potential rendering issues.

3. **Add a small delay before refetch** after user creation to let database triggers complete before fetching the updated user list.

### Specific Code Changes

| Location | Change |
|----------|--------|
| `fetchUsers` function signature | Add a second parameter `showToast = false` to control toast display |
| Line 174 (toast call) | Wrap in `if (showToast)` condition |
| Line 76 (initial mount) | Keep as `fetchUsers()` -- no toast |
| Line 273 (after create) | Change to `setTimeout(() => fetchUsers(true), 500)` -- no toast, small delay |
| Line 348 (after edit) | Change to `fetchUsers(true)` -- no toast |
| Line 405 (after delete) | Change to `fetchUsers(true)` -- no toast |
| Line 537 (Refresh button) | Change to `fetchUsers(true, true)` -- with toast |
| All DialogContent elements | Add `DialogDescription` import and component inside each dialog |

## No Backend Changes

All fixes are client-side in the single `UserManagement.tsx` file.

