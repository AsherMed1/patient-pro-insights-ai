
# Plan: Add Password Visibility Toggle to Reset Password Dialog

## Overview
Add an eye/eye-off icon button to the password input in the Reset Password dialog, allowing admins to toggle between hidden and visible password text.

## Changes

### File: `src/components/UserManagement.tsx`

1. **Add `Eye` and `EyeOff` to the lucide-react import** (existing icon import line).

2. **Add state variable**: `const [showResetPasswordText, setShowResetPasswordText] = useState(false)` -- reset to `false` when the dialog opens (inside `startResetPassword`).

3. **Wrap the password Input in a relative div** and add a toggle button (lines 911-917):

```
<div className="relative">
  <Input
    id="resetPassword"
    type={showResetPasswordText ? "text" : "password"}
    value={resetPasswordValue}
    onChange={(e) => setResetPasswordValue(e.target.value)}
    placeholder="Leave blank to auto-generate"
    className="pr-10"
  />
  <button
    type="button"
    onClick={() => setShowResetPasswordText(!showResetPasswordText)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    tabIndex={-1}
  >
    {showResetPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
</div>
```

## No Backend Changes
This is a UI-only enhancement in one file.
