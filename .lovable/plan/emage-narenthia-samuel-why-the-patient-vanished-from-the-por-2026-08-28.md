# Emage — Narenthia Samuel: why the patient vanished from the Portal

## What actually happened

The patient **was** in the Portal and **was** declined — she just became invisible four seconds later.

Record: Narenthia Samuel, Emage Fibroid Centers, appt Sep 2, 2026 2:30 PM, GHL contact `cX2hJqOUJznhfZzG2odh`.

Timeline (Aug 26, 2026, UTC):

```text
14:31:15  Row created from GHL (Confirmed, Review Queue "New")
14:45:19  Contact attempt: Call - No answer            (Christopher Gonzalez)
14:45:28  Contact attempt: Call - Reached, pt hung up  (Christopher Gonzalez)
14:46:57  Status Confirmed -> Cancelled + Declined
          reason: "Missing or incomplete insurance information -
          Tried to contact pt, but pt hung up (Reschedule: yes)"
14:46:58  GHL tag push FAILED: appointment-declined, declined-missing-insurance
14:47:01  is_superseded = true   <-- record disappears from every tab
```

So: declined in the Portal by Christopher Gonzalez, and the cancellation did reach GHL/LeadSquared. The only defect is that the declined record then got hidden even from the Declined tab.

## Root cause

`ghl-webhook-handler` → `findExistingAppointment()`: when every row for a GHL event ID is a declined/dismissed snapshot, it marks them all `is_superseded = true` and returns `null`, expecting the caller to insert a fresh replacement row. But the caller **skips inserts for terminal statuses** (Cancelled/No Show/Showed). GHL's cancellation echo arrived at 14:47:01, so the snapshot was retired and no replacement was ever created — leaving zero visible rows for that contact. Every Review Queue bucket (including Declined) filters `is_superseded = false`, so the patient looked like she had never existed.

This is a general bug: any Review-Queue decline that is confirmed back by a GHL cancellation webhook can erase itself the same way.

## Fix

1. **Don't retire a snapshot unless a replacement is actually created.** In `findExistingAppointment`, stop superseding declined/dismissed snapshots inline. Instead return a marker (`null` plus the snapshot IDs) and only mark them superseded after the new row has been successfully inserted. When the incoming status is terminal and no insert happens, the snapshot stays visible in the Declined tab.
2. **Never fully hide declined snapshots.** The Declined bucket in `ReviewQueue.tsx` should include declined rows regardless of `is_superseded`, so a retired snapshot is still auditable. Other buckets keep excluding superseded rows.
3. **Restore this record** — clear `is_superseded` on `e7de9a0c-...` so Narenthia Samuel shows in the Emage Declined tab with her full note history intact.
4. **Investigate the failed GHL tag push** for this contact (`appointment-declined`, `declined-missing-insurance`, `declined-reschedule` all failed at 14:46:58) and re-push the tags so the GHL side reflects the decline reason.

## Answer for Marissa / Dean

Yes — the patient was declined in the Portal Review Queue on Aug 26 by Christopher Gonzalez, reason "Missing or incomplete insurance information — tried to contact patient, patient hung up". A sync bug then hid the declined record from the Declined tab, which is why nobody could find her. Restoring the record and shipping the fix above.

## Technical scope

- `supabase/functions/ghl-webhook-handler/index.ts` — defer snapshot supersede until a replacement row exists.
- `src/components/admin/ReviewQueue.tsx` — Declined bucket query no longer filters out superseded declined rows.
- One-off SQL: un-supersede appointment `e7de9a0c-0470-4e25-950a-d5e5435336d9`.
- Re-run `update-ghl-contact-tags` for contact `cX2hJqOUJznhfZzG2odh`.
