## Add Horizon to Time Preference UI

**File:** `src/components/appointments/AppointmentCard.tsx` (line 1587)

Add `'Horizon Vascular Specialists'` to the project allowlist that renders the Time Preference dropdown:

```tsx
{['Premier Vascular', 'ECCO Medical', 'Davis Vein & Vascular', 'Horizon Vascular Specialists'].includes(appointment.project_name) && (
```

This mirrors the existing behavior for the other three unscheduled-capture projects — a Morning/Afternoon/Evening/No Preference selector appears on the appointment card, writing to `time_preference` and setting `is_unscheduled: true`.

No other changes needed — webhook ingestion already stores `time_preference` for Horizon (from the previous fix).