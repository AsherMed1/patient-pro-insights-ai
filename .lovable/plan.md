## Goal
Fix the Insurance Information modal so it:
1. Shows the Secondary insurance (provider, plan, ID, group, Front + Back card photos) in addition to Primary.
2. Always renders both Front and Back card photos for Primary when both exist (your screenshot only shows Front, even though `insurance_back_link` is present in the DB).
3. Correctly labels Front vs Back for NVVI Test (the image currently labeled "Front" is actually the back of the Medicare card — the two primary URLs were swapped during the earlier backfill).

## Changes

### 1. `src/components/InsuranceViewModal.tsx`
- Extend `InsuranceInfo` props with optional secondary fields:
  - `secondary_provider`, `secondary_plan`, `secondary_id`, `secondary_group_number`, `secondary_front_link`, `secondary_back_link`.
- Add a "Secondary Insurance" section (only rendered when any secondary field exists), styled like Primary but with a "Secondary" badge.
- In the Insurance Card Photos block, always render Front and Back side-by-side when their URLs exist (no behavior change to logic; just ensure layout is consistent — single image centers when only one side is present).
- Add a second Card Photos block below the Secondary section for the secondary Front/Back images.

### 2. Pass secondary data into the modal at all 3 call sites
- `src/components/appointments/AppointmentCard.tsx` (`getInsuranceData`)
- `src/components/appointments/DetailedAppointmentView.tsx` (`getInsuranceData`)
- `src/components/leads/LeadCard.tsx` (inline insuranceInfo prop)

Map from `appointment.parsed_insurance_info`:
- `secondary_provider` ← `secondary_provider` || `secondary_insurance_provider`
- `secondary_plan` ← `secondary_plan`
- `secondary_id` ← `secondary_id_number`
- `secondary_group_number` ← `secondary_group_number`
- `secondary_front_link` ← `secondary_card_front_url` || `secondary_card_url`
- `secondary_back_link` ← `secondary_card_back_url`

### 3. Fix swapped Primary URLs for NVVI Test (`6e23e6a5-2d35-411b-952a-28312ed85378`)
The current DB state has Front = `Hr5uBaMlWQeZxVBRMPpA` and Back = `mypNg9LrlJ2wZpb6j30d`, but the rendered "Front" image is actually the back of the Medicare card. Swap them so `insurance_id_link` = `mypNg9LrlJ2wZpb6j30d` (front) and `insurance_back_link` = `Hr5uBaMlWQeZxVBRMPpA` (back). Migration via the migration tool (requires your approval).

## Out of scope
- No changes to parsing logic, edge functions, or upload components — Secondary upload + parsing already works; this is purely a display fix.
