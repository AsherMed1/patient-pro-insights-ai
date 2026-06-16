## Goal
Hide every OON appointment from the client-facing portal. OON appointments remain visible to admins via the Review Queue only — same model as Declined today.

## Behavior change

| Surface | Before | After |
|---|---|---|
| Project portal (client view) — New / Upcoming / Needs Review / Completed / All tabs | Showed both `approved` and `oon` rows | Shows only `approved` rows |
| Review Queue (admin) → OON tab | Lists OON rows | Unchanged |
| Marking OON from Review Queue | Sets `status='OON'`, `review_status='oon'`, fires OON Slack alert, **releases to portal** | Same, except **does NOT release to portal** (admin-only) |
| Existing OON rows already in portals | Visible | Immediately hidden on next page load (no migration needed — driven by the filter) |
| Status changed to OON later from inside the portal (admin/agent edit on an already-approved row) | Stays visible | Stays visible — `review_status` remains `approved`. See "Open question" below. |

## Code changes (4 files, 1-line filter swaps + copy update)

1. **`src/pages/ProjectPortal.tsx`** line 242
   `.in('review_status', ['approved', 'oon'])` → `.eq('review_status', 'approved')`

2. **`src/components/AllAppointmentsManager.tsx`** lines 216, 364, 532 — same swap on all three queries.

3. **`src/components/admin/ReviewQueue.tsx`** — update the OON confirm dialog (line ~1220) so the copy matches the new behavior:
   - Old: *"Sets status to OON, releases the appointment to the project portal, and fires the OON Slack alert."*
   - New: *"Sets status to OON, keeps the appointment hidden from the project portal (admin-only), and fires the OON Slack alert."*

4. **`mem://index.md`** Core rule "Review Queue Gate" — update wording from *"hidden from all client portals until admin Approves or marks OON"* to *"hidden from all client portals until admin Approves. OON rows stay admin-only (Review Queue → OON tab)."*

## Out of scope (not touched)
- `account-performance-metrics` edge function still counts `approved` only — already correct, no change.
- `ghl-webhook-handler` review-status logic — unchanged. New OON-from-webhook appointments still land in `pending` → admin must mark OON → hidden.
- Reporting / dashboards / exports — unchanged. Those query `all_appointments` directly without the `review_status` filter, so OON still rolls up in admin reporting (correct).
- Review Queue OON tab itself — unchanged.

## Open question (please confirm before I build)
Today, an appointment can become OON two ways:

- **A.** Admin marks it OON from the Review Queue while it's still `pending` → `review_status='oon'`. **This plan hides it. ✅**
- **B.** Appointment was already approved and visible in the portal, then someone (admin/agent) changes `status` to `OON` from the portal dropdown → `review_status` stays `approved`. **This plan still shows it** (with the orange OON pill) in the portal's Completed tab.

Should I also hide case **B** (any row with `status='OON'` regardless of `review_status`)? My recommendation is **yes** — your ask was "hide OON from the portal," and a status-based filter is more bulletproof than a review_status-only filter. If you confirm, I'll add `.not('status', 'eq', 'OON')` (case-insensitive via `.not.ilike`) to the same four queries.

**Reply "yes hide all OON" to go with the bulletproof version, or "review queue only" to hide only case A.**