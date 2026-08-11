# Interactive Portal Tour for Clinic Users

Add a guided, step-by-step walkthrough to the client portal (`/project/:projectName`) that runs automatically the first time a clinic user signs in, and can be replayed any time from a new Help menu.

## Experience

**First login:** after the portal finishes loading, the tour starts on its own for users who are new from this release onward. A dimmed overlay highlights one element at a time with a small card explaining it, plus Back / Next / Skip tour and a step counter ("3 of 12"). Skipping or finishing marks the tour complete for that user, so it never auto-starts again.

**Existing users:** anyone who has already used the Portal is marked as done up front and will not see the automatic tour — they can start it whenever they want from Help > Start Portal Tour.

**Any time after:** a Help button in the portal header opens a single menu containing:
- Start Portal Tour (restarts the walkthrough from step 1)
- The existing help videos, listed in the same menu

**Interactive:** each step highlights a real element in the live portal, and steps that belong to another section switch the portal to that section first (for example, moving to the Overview step activates the Overview tab). Users can click around normally; the tour follows the section it put them in.

## Steps covered (navigation-level)

1. Welcome — what the portal is for
2. Clinic header — which clinic you are viewing
3. Side rail — Appointments and Overview icons, Settings, Sign out
4. Appointment status tabs — New / Needs Review / Completed and what routes where
5. Status meanings — Confirmed, Showed, Cancelled, No Show, Rescheduled, OON
6. Search — find a patient by name, phone, or email
7. Filters — date range, service, location, and the Appt Date vs Created Date toggle
8. Appointment card — where demographics, insurance, and intake details live
9. Updating a patient — editing details and changing appointment status
10. Notes — adding an internal note to a patient record
11. Calendar view — seeing approved appointments on a schedule
12. Overview / reporting — stats cards and date-range reporting (only shown when that section is visible to the user)
13. Wrap-up — reminder that the tour lives under Help

Steps whose target is not present for that user (for example Overview when it is hidden) are skipped automatically.

## Technical details

- **Tour engine:** small in-house component (`src/components/tour/PortalTour.tsx`) plus a step definition file (`src/components/tour/portalTourSteps.ts`). No new dependency; uses a fixed overlay with a cut-out positioned from `getBoundingClientRect()` of a `data-tour="..."` attribute, and a Radix `Popover`-style card anchored to it. Handles scroll-into-view, resize/scroll reposition, and missing targets.
- **Anchors:** add `data-tour` attributes to existing elements in `ProjectPortal.tsx`, `ProjectHeader`, the appointment tab list, `AppointmentFilters.tsx`, the search input, the first appointment card, the notes area, and the stats cards. Presentation-only changes; no logic touched.
- **Section control:** the tour dispatches `setActiveTab` / appointment-tab changes through callbacks passed from `ProjectPortal.tsx`, so steps in other sections navigate before highlighting.
- **Completion state:** new column `portal_tour_completed_at timestamptz` on `public.profiles` (users update their own row under existing policies). Auto-start condition: clinic-portal user, value is null. "Start Portal Tour" replays without clearing it. A `localStorage` fallback prevents a re-show flash while the profile loads.
- **Existing users excluded:** the same migration backfills `portal_tour_completed_at = now()` for every profile that already exists, so nobody who has used the Portal before gets an unexpected auto-tour — they reach it via Help > Start Portal Tour. Only profiles created after the migration have a null value and therefore get the automatic first-login tour.
- **Help menu:** new `PortalHelpMenu.tsx` rendered in the portal header (`ProjectHeader` / `PortalHeader`), listing the tour entry plus rows from the existing `help_videos` table, opening each video in the current video dialog.
- **Scope:** clinic portal only. `Index.tsx` admin dashboard, QA, Review Queue, and Recapture surfaces are untouched.
