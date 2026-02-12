

# Remove Redundant Admin Button

## Problem
The "Admin" button next to Settings in the header bar simply sets `activeTab` to `'users'`, which is identical to clicking the "Users" tab. This is confusing and redundant.

## Fix

### File: `src/pages/Index.tsx`
- Remove the "Admin" button block (lines 237-242) from the header controls
- The "Users" tab in the tab bar (already gated behind `hasManagementAccess()`) remains the single way to access User Management

### Result
The header will show: Email | Settings | Sign Out (no more duplicate "Admin" button). Admins and agents still access Users via the tab bar.

