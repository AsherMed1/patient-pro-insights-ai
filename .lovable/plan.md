

# Plan: Fix Root-Level customFields Extraction in Webhook Handler

## Problem Identified

The test webhook sent `customFields` at the root level of the payload:

```json
{
  "type": "AppointmentCreate",
  "appointment": { ... },
  "customFields": [    // ← Root level
    { "key": "had_imaging_before", "value": "Yes, Last year january at clinic x" }
  ]
}
```

But `extractStandardEventFormat()` only checks:
- `contact.customFields` (inside appointment.contact)
- `apt.customFields` (inside appointment)

It does **not** check `payload.customFields`, causing the imaging field to be lost.

---

## Solution

Update the `extractStandardEventFormat` function to also check for `payload.customFields` (root level):

### File: `supabase/functions/ghl-webhook-handler/index.ts`

**Line 376 - Update customFields extraction:**
```typescript
// Before:
const patientIntakeNotes = formatCustomFieldsToNotes(contact.customFields || apt.customFields || [])

// After:
const patientIntakeNotes = formatCustomFieldsToNotes(contact.customFields || apt.customFields || payload.customFields || [])
```

**Line 398 - Update insurance URL extraction:**
```typescript
// Before:
insurance_id_link: extractInsuranceCardUrl(contact.customFields || apt.customFields),

// After:
insurance_id_link: extractInsuranceCardUrl(contact.customFields || apt.customFields || payload.customFields),
```

---

## Technical Details

### Changes Summary

| Line | Before | After |
|------|--------|-------|
| 376 | `contact.customFields \|\| apt.customFields \|\| []` | `contact.customFields \|\| apt.customFields \|\| payload.customFields \|\| []` |
| 398 | `contact.customFields \|\| apt.customFields` | `contact.customFields \|\| apt.customFields \|\| payload.customFields` |

### Files to Modify
- `supabase/functions/ghl-webhook-handler/index.ts`

---

## Verification

After deploying, send a test webhook with `had_imaging_before` at the root level:
```json
{
  "customFields": [
    { "key": "had_imaging_before", "value": "Yes, Last year january at clinic x" }
  ]
}
```

The field should appear in the Medical Information section of Patient Pro Insights with "Had Imaging Before: Yes, Last year january at clinic x"

