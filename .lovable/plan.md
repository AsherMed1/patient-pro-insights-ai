## No action needed — already fixed

Checked the record `18625570-5d25-4771-af88-1e37e5c3100f`:

- `project_name`: Horizon Vascular Specialists
- `time_preference`: **afternoon** ✅ (already stored, parsed from "Time Preference: Afternoon" in the notes)
- `is_unscheduled`: true

The data is correct. The reason the badge/dropdown wasn't rendering on the card was the UI allowlist we just patched in the previous turn (`src/components/appointments/AppointmentCard.tsx` line 1587 now includes `'Horizon Vascular Specialists'`).

**Next step for you:** Hard refresh the portal (Cmd/Ctrl+Shift+R). The "Time Preference: Afternoon" selector will appear on Test Fixed Johann's card. No database change or additional code change required.