## Goal

Sync the GHL Contact custom field **"Notes (Example: Imaging, Secondary, etc.)"** into the portal's Medical Information → **Notes:** chip. Zero impact on any existing behavior.

---

## Why the safety question matters

The current `ghl-webhook-handler` detects payload shape at line 612 like this:

```
if (payload.calendar || payload.contact_id || payload.first_name) {
  → extractWorkflowFormat  → appointment upsert path
}
```

A GHL **Contact Changed** webhook default body contains `contact_id` and `first_name`. Without a guard it would flow into that appointment path and could touch existing rows. So the intercept **must run before** `extractWebhookData` is called, and must be strictly scoped so nothing else matches it.

---

## Part A — GHL Setup (you do this first)

1. Automation → Workflows → **+ Create Workflow → Start from scratch**
2. Name: `Sync Contact Notes → Portal`
3. **Trigger: Contact Changed** → filter: Custom Field **Notes (Example: Imaging, Secondary, etc.)** *has changed*
4. **Action: Webhook**
   - Method: `POST`
   - URL: `https://bhabbokbhnqioykjimix.functions.supabase.co/ghl-webhook-handler`
   - Body: **Custom Data** (recommended) with only:
     ```json
     {
       "sync_type": "contact_notes_only",
       "contact_id": "{{contact.id}}",
       "location_id": "{{location.id}}",
       "notes_value": "{{contact.notes__example__imaging__secondary__etc_}}"
     }
     ```
     (exact merge-tag name comes from the field's picker in GHL)
   - If Custom Data is unavailable in your GHL plan, fall back to Default body — the intercept below still catches it, but Custom Data is the belt-and-suspenders option.
5. **Save → Publish**

---

## Part B — Portal Side (single edge function edit)

**File:** `supabase/functions/ghl-webhook-handler/index.ts`

Insert a new branch **immediately after the JSON parse and BEFORE the call to `extractWebhookData`** (around line ~97). The branch:

**Match conditions — ALL must be true (very strict):**
1. Payload has `contact_id` (or `contactId`)
2. Payload has **no** `appointment` object
3. Payload has **no** `calendar` object
4. Payload has **no** `type` field mentioning "appointment"
5. Payload has **no** `appointmentStatus` and **no** `status` field
6. **AND** either:
   - `sync_type === "contact_notes_only"` (Custom Data path), OR
   - the target Notes custom field is present in `customFields` (Default body path)

If any condition fails → fall through untouched to existing logic.

**Action when it matches:**
1. Resolve the new Notes value: prefer `notes_value` (Custom Data), else read the field from `customFields` by field ID / label match.
2. If value is empty/null/whitespace → return `{ ok: true, branch: "contact_notes_sync", updated: 0, reason: "empty" }` and exit.
3. Query `all_appointments` for rows where `ghl_id = <contact_id>` AND `is_superseded = false` AND status NOT IN (Cancelled, Canceled, No Show, Rescheduled, Won, OON, Do Not Call).
4. For each matching row: merge `{ notes: <new value> }` into `parsed_medical_info` (single-key JSON merge, all other keys preserved byte-for-byte). No other column touched.
5. Insert ONE `appointment_notes` row per updated appointment: `"Medical Notes updated from GHL: <first 120 chars>"`.
6. Return `{ ok: true, branch: "contact_notes_sync", updated: <n> }` and `return` — never reach `extractWebhookData`.

---

## Safety guarantees (line by line)

| Concern | Guarantee |
|---|---|
| Could this create a new appointment? | No — branch exits before `getUpdateableFields` / insert path is reached. |
| Could this update appointment status / date / calendar? | No — only `parsed_medical_info.notes` is written. |
| Could it overwrite other Medical Info keys (PCP, imaging_location…)? | No — JSON merge, single key. |
| Could it touch terminal appointments (Cancelled/OON/DNC/etc.)? | No — filtered out in the query. |
| Could it fire Slack / status webhook / GHL tag update / auto-parse? | No — none of those calls exist in this branch. |
| Could a normal Appointment webhook accidentally match this branch? | No — conditions require the absence of `appointment`, `calendar`, `status`, and `appointmentStatus`. Appointment webhooks always carry at least one of those. |
| Could a normal Contact webhook (not Notes) accidentally match? | Only if the Notes field is present in payload; if empty → early exit with `updated: 0`. Nothing else changes. |
| Rollback? | Revert one file. No migration, no schema, no RLS change. |
| If the GHL workflow isn't published? | Branch never fires. Portal behaves exactly as today. |

---

## Test plan

1. Publish GHL workflow, edit Notes on **Test Johann Booked**, save.
2. Edge logs → expect `branch: "contact_notes_sync", updated: 1`.
3. Portal card → **Notes:** shows new value; every other field (DOB, phone, calendar, status, PCP, imaging) unchanged.
4. Confirm no new `appointment_notes` beyond the single "Medical Notes updated from GHL: …" row.
5. Sanity: create a normal booking in GHL → verify it still lands in Review Queue as usual (proves we didn't break the appointment path).

---

## Explicitly NOT doing

- Duplicated notes block display bug
- Standalone ContactUpdate for any other custom field
- Force-reparse flag
- GHL Contact "Notes tab" sync (different object)
