

## Short-Notice Appointment Alert System

### Overview
When an appointment is created or rescheduled such that the time between creation and the appointment itself is within a configurable threshold (default 72 hours), fire a Slack alert and log it for dashboard visibility. Applies to both confirmed and unconfirmed appointments.

### Database Changes (1 migration)

**1. Add `short_notice_threshold_hours` to `projects` table**
```sql
ALTER TABLE public.projects
ADD COLUMN short_notice_threshold_hours integer NOT NULL DEFAULT 72;
```

**2. Create `short_notice_alerts` table for audit/reporting**
```sql
CREATE TABLE public.short_notice_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.all_appointments(id) ON DELETE CASCADE NOT NULL,
  project_name text NOT NULL,
  lead_name text NOT NULL,
  appointment_datetime timestamptz,
  created_datetime timestamptz,
  hours_difference numeric NOT NULL,
  alert_sent_at timestamptz DEFAULT now(),
  slack_sent boolean DEFAULT false,
  ghl_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.short_notice_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view short notice alerts"
  ON public.short_notice_alerts FOR SELECT TO authenticated USING (true);
```

### New Edge Function: `notify-slack-short-notice`

A lightweight function (mirroring `notify-slack-oon` pattern) that:
1. Receives appointment details + hours difference
2. Sends a Slack alert to `SLACK_SHORT_NOTICE_WEBHOOK_URL` (new secret needed)
3. Inserts a record into `short_notice_alerts` for reporting

**Slack payload fields:**
- Header: "SHORT-NOTICE APPOINTMENT"
- Clinic name (project_name)
- Patient name
- GHL link (if ghl_id exists): `https://app.gohighlevel.com/contacts/detail/{ghl_id}`
- Appointment date/time
- Time difference (e.g., "Booked 19h before appt")
- Status (confirmed/unconfirmed)

### Integration Points (where to call the alert)

**1. `ghl-webhook-handler/index.ts`** — After successful create or update (line ~190), add a call to evaluate short-notice criteria and invoke the alert function if triggered.

**2. `all-appointments-api/index.ts`** — After successful create/update (line ~260), same logic.

**3. `update-appointment-fields/index.ts`** — When `date_of_appointment` or `requested_time` changes (reschedule), re-evaluate.

The evaluation logic (shared helper):
```typescript
async function checkShortNoticeAlert(supabase, appointment, requestId) {
  if (!appointment.date_of_appointment) return;
  
  // Skip terminal statuses
  const status = (appointment.status || '').toLowerCase().trim();
  const terminal = ['cancelled', 'canceled', 'no show', 'showed', 'oon'];
  if (terminal.some(t => status.includes(t))) return;
  
  // Get project threshold
  const { data: project } = await supabase
    .from('projects')
    .select('short_notice_threshold_hours')
    .eq('project_name', appointment.project_name)
    .single();
  
  const threshold = project?.short_notice_threshold_hours ?? 72;
  if (threshold === 0) return; // 0 = disabled
  
  // Calculate hours difference
  const apptTime = new Date(appointment.date_of_appointment + 'T' + (appointment.requested_time || '09:00'));
  const createdTime = new Date(appointment.date_appointment_created || appointment.created_at);
  const hoursDiff = (apptTime - createdTime) / (1000 * 60 * 60);
  
  if (hoursDiff <= threshold && hoursDiff > 0) {
    // Fire alert
    supabase.functions.invoke('notify-slack-short-notice', {
      body: { ...relevant fields, hoursDifference: hoursDiff }
    });
  }
}
```

### Config UI

Add a "Short-Notice Threshold" dropdown to the project settings (in `EditProjectDialog.tsx`):
- Options: Disabled (0), 48 hours, 72 hours (default), 168 hours
- Saves to `projects.short_notice_threshold_hours`

### Secret Required
- `SLACK_SHORT_NOTICE_WEBHOOK_URL` — User will need to provide a Slack incoming webhook URL for the target channel

### Changes Summary

| File | Change |
|------|--------|
| Migration SQL | Add `short_notice_threshold_hours` column to projects, create `short_notice_alerts` table |
| `supabase/functions/notify-slack-short-notice/index.ts` | New edge function: send Slack alert + log to `short_notice_alerts` |
| `supabase/config.toml` | Add `[functions.notify-slack-short-notice]` entry |
| `supabase/functions/ghl-webhook-handler/index.ts` | Add `checkShortNoticeAlert()` call after appointment create/update |
| `supabase/functions/all-appointments-api/index.ts` | Add `checkShortNoticeAlert()` call after appointment create/update |
| `supabase/functions/update-appointment-fields/index.ts` | Add short-notice check when `date_of_appointment` changes |
| `src/components/projects/EditProjectDialog.tsx` | Add threshold dropdown to project settings |

