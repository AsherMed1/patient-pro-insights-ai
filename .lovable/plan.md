# Georgia Endovascular — "patients disappearing" from the portal

## Short answer: nothing is deleted

Georgia Endovascular has **1,860 appointment records**, the oldest dated **Mar 10, 2025**, covering **1,578 distinct patients**. The audit log contains **no appointment deletions ever** (the only `deleted` events are user-account deletions). Volume is not causing purging, and there is no retention job removing patient rows.

What is happening is that some records are **hidden from the clinic view**, and the portal's search makes older patients hard to reach.

## What the clinic actually sees

Of the 1,860 rows, only **1,529 are visible** to Georgia Endo. The rest are filtered out of every client-facing view:

| Bucket | Rows | Visible to clinic? |
|---|---|---|
| Approved, active | 1,529 | Yes |
| Reserved time blocks | 150 | No (correct — not patients) |
| Superseded duplicates | 126 | No |
| Declined | 41 | No |
| Potential OON | 12 | No |
| Dismissed | 2 | No |

## Three real causes, in order of impact

**1. Search runs inside the selected tab, and the portal opens on "New".**
The appointment list defaults to the **New** tab. A search for a patient seen months ago returns nothing there, because that tab only holds records that are not yet internally processed. The patient is present under **All** (or **Completed**), but nothing tells the user that — the result just reads as "patient not in the portal". This is very likely most of what Georgia Endo is reporting.

**2. 22 patients truly have no visible row.**
When a duplicate booking is retired (`is_superseded`), the surviving row is normally still visible. For 22 Georgia Endo records the retired row is the *only* row for that person — no active sibling exists, so the patient vanishes from the portal entirely. These are genuinely unreachable today and need to be identified and restored.

**3. Declined / OON records look deleted to the clinic.**
41 declined and 12 potential-OON records — including past-dated ones the clinic did see in person, e.g. patients dated Aug 5–20 — are admin-only by design. From the clinic's chair, a patient they treated is simply gone.

There is also a reporting bug: the Overview stat cards query without paging, so PostgREST caps the result at 1,000 rows. Georgia Endo has more than that, so **Total Appointments / Showed / Procedures are silently undercounted** for this clinic.

## Proposed fix

1. **Make search global across tabs.** When a search term is entered, drop the tab restriction and search the full approved history for the project, showing which bucket each hit belongs to. Add an explicit hint when a search returns nothing in the current tab but has matches elsewhere.
2. **Recover the 22 orphaned records.** Audit every superseded Georgia Endo row that has no active sibling, un-supersede it with an internal note, and re-run the same check across all projects to see whether other clinics are affected.
3. **Prevent recurrence.** Refuse to mark a row superseded when it would leave the contact with zero visible rows, and log that case for review.
4. **Surface declined / OON to the clinic as read-only history** rather than hiding them outright — a patient the clinic physically saw should still be findable, with its status shown plainly.
5. **Fix the stat-card cap.** Page the Overview stats query past 1,000 rows so totals are accurate for high-volume clinics.

## Technical notes

- `src/components/AllAppointmentsManager.tsx`: skip the `activeTab` predicate block when `searchTerm` is non-empty; keep project, date and status filters. Server pagination already exists, so no perf change.
- Orphan detection: superseded rows in `all_appointments` where no non-superseded `review_status='approved'` row shares the same `ghl_id` or `lead_name` within the project. Recovery is an `is_superseded=false` update plus an internal-visibility `appointment_notes` entry — no deletions.
- Guard: extend `merge_older_active_siblings` / the webhook supersede path to count remaining active siblings before setting the flag.
- `src/pages/ProjectPortal.tsx` `fetchAppointmentStats`: add 1,000-row paging (same loop pattern already used in `AppointmentFilters.tsx`).
- Declined/OON visibility is a policy change — confirm before shipping step 4.
