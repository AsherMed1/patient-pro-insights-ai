

## Fix: Display Back Side of Insurance Card in Modal

The `insurance_back_link` field exists in the database and the upload component saves it, but it's never passed through to the Insurance View Modal. Three places need updating:

### Changes

**1. `src/components/appointments/AppointmentCard.tsx` (line ~562-563)**
Add `insurance_back_link` to `getInsuranceData()`:
```typescript
insurance_id_link: appointment.insurance_id_link || 
                  leadInsuranceData?.insurance_id_link,
insurance_back_link: appointment.insurance_back_link ||    // ADD THIS
                    leadInsuranceData?.insurance_back_link, // ADD THIS
```

**2. `src/components/appointments/DetailedAppointmentView.tsx` (line ~318)**
Add `insurance_back_link` to `getInsuranceData()`:
```typescript
insurance_id_link: leadDetails?.insurance_id_link || appointment.insurance_id_link,
insurance_back_link: leadDetails?.insurance_back_link || appointment.insurance_back_link, // ADD THIS
```

**3. `src/components/leads/LeadCard.tsx` (line ~254)**
Add the field to the inline object:
```typescript
insurance_id_link: lead.insurance_id_link,
insurance_back_link: lead.insurance_back_link, // ADD THIS
```

No changes needed in `InsuranceViewModal.tsx` itself -- it already has full support for rendering the back image side-by-side with the front. The data just wasn't being passed in.

