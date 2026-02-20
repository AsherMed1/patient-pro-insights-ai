
# Add Admin-Only GHL Contact Link to Patient Name

## What Will Change

When an admin views an appointment (in either the card list or the detailed modal), they will see a small GHL icon link next to the patient's name. Clicking it opens the patient's GoHighLevel contact page in a new tab. Non-admin users (agents, project users) will not see this link.

## GHL Contact URL Format

The link is constructed as:
```
https://app.gohighlevel.com/v2/location/{ghl_location_id}/contacts/detail/{ghl_id}
```

Both `ghl_location_id` and `ghl_id` already exist on the `AllAppointment` type and are stored in the database. The link is only shown when both values are present AND the user is an admin.

## Files Changed

### 1. `src/components/appointments/AppointmentCard.tsx`

In the patient name row (around line 950-966), right after the patient name span and before the edit pencil button, add an admin-only GHL link icon:

```tsx
{isAdmin() && appointment.ghl_id && appointment.ghl_location_id && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={`https://app.gohighlevel.com/v2/location/${appointment.ghl_location_id}/contacts/detail/${appointment.ghl_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-orange-100 text-orange-500 hover:text-orange-600 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </TooltipTrigger>
      <TooltipContent>Open in GoHighLevel</TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

`ExternalLink` is already imported in this file (line 8), and `isAdmin()` from `useRole` is already destructured (line 94).

### 2. `src/components/appointments/DetailedAppointmentView.tsx`

The `DetailedAppointmentView` currently doesn't import `useRole`. We need to:

1. Import `useRole` at the top.
2. Import `ExternalLink` from `lucide-react`.
3. Destructure `isAdmin` inside the component.
4. In the Appointment Overview card (around line 506-516), where the patient name is shown in a `<div>`, wrap the name area to add the GHL link next to it:

```tsx
<div className="flex items-center space-x-2 cursor-default">
  <User className="h-4 w-4 text-muted-foreground" />
  <span>{appointment.lead_name}</span>
  {isAdmin() && appointment.ghl_id && appointment.ghl_location_id && (
    <a
      href={`https://app.gohighlevel.com/v2/location/${appointment.ghl_location_id}/contacts/detail/${appointment.ghl_id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 hover:underline"
      title="Open in GoHighLevel"
    >
      <ExternalLink className="h-3 w-3" />
      GHL
    </a>
  )}
</div>
```

## Why This Is Safe

- The link is gated by `isAdmin()` which reads from the `user_roles` table via the `useRole` hook — server-side role data, not client-side storage.
- Non-admin users simply won't see the element rendered at all.
- The link uses `target="_blank"` with `rel="noopener noreferrer"` for security.
- If either `ghl_id` or `ghl_location_id` is missing, the link won't render (no broken URLs).
