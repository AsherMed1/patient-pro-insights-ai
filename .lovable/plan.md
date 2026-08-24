# Georgia Endo — "patients we saw a while back are gone"

Nothing is being deleted. I re-checked the data today: Georgia Endovascular has 1,868 appointment records (1,571 currently visible to the clinic) and there are **zero** appointment deletions in the audit log. Three separate things make old patients look missing.

## What is actually happening

1. **Search only looks inside the tab you're on.** The portal opens on the appointments list with a tab selected (New / Needs Review / Upcoming / Completed). Searching a patient seen months ago while sitting on New returns nothing, even though the record exists under All or Completed. Nothing tells the user to switch tabs — it reads as "the patient isn't in the portal."

2. **13 records are hidden as retired duplicates with no surviving twin.** When two rows exist for the same person, one is marked as a retired duplicate and hidden. For 13 Georgia Endo records the hidden row is the *only* row for that person, so the patient disappears from every clinic view.

3. **Records the clinic physically saw can be hidden by admin-only states.** 64 declined, 14 potential-OON and 2 dismissed Georgia Endo rows are invisible to the clinic. Some of those are patients the clinic did see and expects to look up.

4. **Overview totals are undercounted.** The stat-card query fetches rows with no paging, so it silently stops at 1,000 rows. Georgia Endo has 1,571 visible records, so the Overview numbers are wrong and reinforce the "records are missing" impression.

## Fix

1. **Global search.** When a search term is entered, drop the tab predicate and search the clinic's full approved history, with a badge on each hit showing which bucket it belongs to. Clearing the search restores normal tab behavior.

2. **Recover the 13 orphaned records.** Un-retire every retired row that has no active sibling for the same contact, with an internal note recording the recovery, and run the same check across all projects.

3. **Prevent recurrence.** Refuse to retire a row when doing so would leave the contact with zero clinic-visible rows, and log the case for admin review.

4. **Read-only history for declined / OON.** Surface these to the clinic in search results and the Completed bucket as read-only entries with the status shown plainly, instead of hiding them.

5. **Fix the 1,000-row cap** on the Overview stats query with the same paging loop already used in the filters query, so totals are accurate.

## Technical notes

- `src/components/AllAppointmentsManager.tsx` — skip the `activeTab` predicate block (and mirror it in the count and tab-count queries) when `searchTerm` is non-empty; derive a bucket label per row for display.
- `src/pages/ProjectPortal.tsx` — `fetchAppointmentStats` currently issues a single unbounded select; page it in 1,000-row batches.
- Orphan detection matches on `ghl_id`, falling back to `lead_name` + project.
- Retire-guard lives with the existing supersede logic (`mark_superseded_on_change` / `merge_older_active_siblings`) so both webhook and portal paths are covered.
- Visibility change for declined/OON is a read filter change only; no status or review_status values are rewritten.

## Validation

Search a known older Georgia Endo patient from the New tab and confirm they appear with the correct bucket badge, confirm the 13 recovered records are findable, and confirm the Overview total reads 1,571 rather than 1,000.
