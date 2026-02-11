

# Plan: Add Password Reset to User Management

## Overview

Add a "Reset Password" button to each user's action row in the User Management table. Clicking it opens a dialog where the admin can either enter a custom password or generate a random one. The existing `admin-reset-password` edge function already handles everything server-side.

## What Changes

### File: `src/components/UserManagement.tsx`

1. **New state variables**: Add `resetPasswordUser`, `resetPasswordValue`, `resetLoading`, `showResetDialog`, `showGeneratedPasswordDialog`, and `generatedPassword`.

2. **New icon import**: Add `KeyRound` from lucide-react.

3. **Reset password handler**: A function that calls `supabase.functions.invoke('admin-reset-password', { body: { userId, newPassword } })`. If no custom password is provided, the edge function generates one and returns it, which is then shown in a confirmation dialog.

4. **New action button**: Add a `KeyRound` icon button next to the existing Edit/Delete/Mail buttons in the Actions column (line ~717). It opens a dialog for the selected user.

5. **Reset Password Dialog**: Contains an input for a custom password (optional), two buttons -- "Reset with Custom Password" and "Generate and Reset" -- and a note that all resets are audit-logged.

6. **Generated Password Dialog**: If a password was auto-generated, a second dialog displays the generated password so the admin can copy and share it securely.

## No Backend Changes

The `admin-reset-password` edge function already exists and handles admin verification, password generation, GHL sync prevention, and audit logging. No database or edge function changes needed.

## Technical Details

| Element | Detail |
|---------|--------|
| Edge function | `admin-reset-password` (existing) |
| Auth check | Edge function verifies caller is admin via `user_roles` |
| Self-reset blocked | Edge function returns error if admin tries to reset own password |
| Audit logging | Edge function logs via `log_audit_event` RPC |
| must_change_password | The edge function does not currently set this flag -- users will be prompted to change on next login only if the flag is set during creation. This can be enhanced later if needed. |

