Update the copy in the **Mark as No Show** modal (`src/components/appointments/NoShowEligibilityDialog.tsx`) to the simplified wording requested by the clinic.

### Changes

1. **Dialog title / question**
   - From: `Mark as No Show` + `Is {patientName} still eligible for rescheduling?`
   - To: `Mark as No Show` + `Can this patient be rescheduled?`

2. **"Eligible" option subtext**
   - From: `Patient stays in normal recapture and outreach workflows.`
   - To: `The patient can be contacted and rescheduled.`

3. **"Not eligible" option subtext**
   - From: `Patient must contact the clinic directly. Removes them from recapture, blocks setters, AI and self-booking, and triggers the clinic-contact text.`
   - To: `The patient must contact the clinic to reschedule.`

4. **Warning banner (shown when "Not eligible" is selected)**
   - From: `This block applies to the patient across this clinic until an admin lifts it.`
   - To: `This restriction remains in place until an admin removes it.`

### Verification

- Run the project typecheck/build to ensure no TypeScript errors.
- Optionally preview the modal in the UI to confirm the new copy renders correctly.