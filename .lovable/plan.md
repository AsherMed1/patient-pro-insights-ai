# Add Davis Vein & Vascular to Unscheduled Capture Flow

Mirror the Premier Vascular / ECCO Medical behavior for **Davis Vein & Vascular**: leads are captured without a date/time, store a `time_preference` (morning/afternoon/evening/no_preference), default to `Pending` status, auto-approve in the review queue, and expose the time-preference dropdown in the appointment card UI.

## Changes

### 1. `supabase/functions/ghl-webhook-handler/index.ts`
- Line 207 `REVIEW_QUEUE_EXEMPT` → add `'Davis Vein & Vascular'`.
- Line 709 `UNSCHEDULED_PROJECTS` set → add `'davis vein & vascular'`.
- Update the `isPremierVascular` variable name comments (functionally fine, but note it now covers Davis too — rename optional).

### 2. `supabase/functions/all-appointments-api/index.ts`
- Line 184 `UNSCHEDULED_PROJECTS` set → add `'davis vein & vascular'`.
- Line 225 + 307 `REVIEW_QUEUE_EXEMPT` arrays → add `'Davis Vein & Vascular'`.

### 3. `supabase/functions/fetch-ghl-contact-data/index.ts`
- Line ~334 time_preference extraction is gated by project; verify and add Davis to the gate if one exists (will inspect during build).

### 4. `src/components/appointments/AppointmentCard.tsx`
- Line 1525 `['Premier Vascular', 'ECCO Medical']` → add `'Davis Vein & Vascular'`.

## Memory
- Add new memory `mem://projects/davis-vein-vascular/unscheduled-capture` and reference it in `mem://index.md` so future agents know Davis follows the same pattern.

## Out of scope
- No DB migration needed (columns already exist).
- No GHL custom-field mapping changes assumed — Davis is expected to send the same `time_preference` field as Premier/ECCO. If not, that's a follow-up.
