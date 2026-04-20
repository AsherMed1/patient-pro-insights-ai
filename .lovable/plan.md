

## Riviann Jerry – Cancel Miami May 11, Keep Hollywood Apr 28

### What you confirmed
Keep: **Hollywood, FL — Apr 28, 2026** (`s0hXKzD5fgtpegS2pdq7`)
Cancel: **Miami, FL — May 11, 2026** (`v9VeSGGA2Go0U7m2H5YV`)

### What I'll do (one-time data fix, no code change)

1. **Update the Miami May 11 record in the portal**
   - `status` → `Cancelled`
   - `cancellation_reason` → `Duplicate booking — patient kept Hollywood Apr 28 appointment`
   - Add internal note attributing the cleanup to the support request from Vivid

2. **Sync the cancellation to GHL** via the existing `update-ghl-appointment` edge function so GHL shows the May 11 slot as cancelled and the Hollywood appointment remains the source of truth.

3. **Auto-side-effects** (handled by existing triggers — no extra work):
   - EMR processing queue: May 11 row auto-resolves to `completed`
   - `internal_process_complete` → true on the cancelled row → drops off New tab
   - GHL workflow fires the clinic's standard cancellation SMS to the patient (if Vivid wants to suppress that, say so before approval and I'll skip the GHL sync step and only update the portal record)
   - Lead in `new_leads` gets removed per existing cancelled-lead-removal rule

### What stays untouched
- Hollywood Apr 28 record — no changes, status remains Confirmed.
- Patient's GHL contact (`NcqzoIxXceg4j1rLHiVv`) — no contact-level edits.

### One thing to flag before approving
The standard cancellation SMS will go out to Riviann unless you tell me to skip GHL sync. Two options:
- **Default (recommended):** Sync to GHL, patient gets a cancellation SMS for the Miami slot. Clean and consistent.
- **Silent:** Only update the portal, do NOT sync to GHL. Vivid's team would then need to manually delete the Miami event in GHL or it'll stay on their calendar there. Use this if Vivid has already spoken to the patient and doesn't want a duplicate SMS.

Approve as-is for the default, or say "silent" and I'll skip the GHL sync.

