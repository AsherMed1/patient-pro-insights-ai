/**
 * Step definitions for the clinic Portal Tour.
 *
 * Each step points at a `data-tour="..."` anchor that already exists in the
 * portal UI. Steps whose anchor is missing for the current user (for example
 * the Overview section when it is hidden) are skipped automatically.
 */
export type PortalTourSection = 'appointments-list' | 'appointments-calendar' | 'overview';

export interface PortalTourStep {
  /** `data-tour` value of the element to highlight. Omit for a centered card. */
  anchor?: string;
  title: string;
  body: string;
  /** Portal section that must be active before this step is shown. */
  section?: PortalTourSection;
  /** Preferred placement of the explanation card relative to the anchor. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const PORTAL_TOUR_STEPS: PortalTourStep[] = [
  {
    title: 'Welcome to your Patient Pro Portal',
    body: "This quick tour walks you through the main parts of the portal: your patient list, appointment statuses, search and filters, patient details, notes, and reporting. It takes about a minute, and you can leave at any time.",
  },
  {
    anchor: 'clinic-header',
    section: 'appointments-list',
    placement: 'bottom',
    title: 'Your clinic',
    body: 'Everything you see in the portal belongs to this clinic. Patient records, appointments, and reporting are all scoped to it.',
  },
  {
    anchor: 'nav-rail',
    section: 'appointments-list',
    placement: 'right',
    title: 'Main navigation',
    body: 'Use this rail to move between Appointments (your patient list and calendar) and Overview (clinic performance). Your account settings and sign out live at the bottom.',
  },
  {
    anchor: 'appt-tabs',
    section: 'appointments-list',
    placement: 'bottom',
    title: 'Appointment buckets',
    body: 'Patients are grouped for you: New for fresh bookings, Needs Review for appointments waiting on action or missing a date, Upcoming and Past by appointment date, and All for everything.',
  },
  {
    anchor: 'appointment-card',
    section: 'appointments-list',
    placement: 'top',
    title: 'Understanding statuses',
    body: 'Each patient row shows a status: Confirmed (booked), Showed (attended), Cancelled, No Show, Rescheduled, and OON (out of network). Changing the status here keeps the record and our team in sync.',
  },
  {
    anchor: 'search',
    section: 'appointments-list',
    placement: 'bottom',
    title: 'Finding a patient',
    body: 'Search by name, phone, email, or date of birth. Pick the search type on the left, then start typing.',
  },
  {
    anchor: 'filters',
    section: 'appointments-list',
    placement: 'bottom',
    title: 'Filtering the list',
    body: 'Narrow the list by status, procedure status, location, or service, sort the results, and use Dates to switch between appointment date and created date.',
  },
  {
    anchor: 'appointment-card',
    section: 'appointments-list',
    placement: 'top',
    title: 'Opening a patient record',
    body: 'Click any patient to open the full record: demographics, insurance details and card images, intake and pathology information, and the appointment history.',
  },
  {
    anchor: 'appointment-card',
    section: 'appointments-list',
    placement: 'top',
    title: 'Updating and adding notes',
    body: 'Inside a record you can correct patient details, change the appointment status, reschedule, and add internal notes. Notes are shared with our team, so use them for anything we should know.',
  },
  {
    anchor: 'view-toggle',
    section: 'appointments-calendar',
    placement: 'bottom',
    title: 'Calendar view',
    body: 'Switch between the list and a day, week, or month calendar of approved appointments. You can also reserve time blocks so we do not book into them.',
  },
  {
    anchor: 'stats-cards',
    section: 'overview',
    placement: 'bottom',
    title: 'Reporting and tracking',
    body: 'The Overview section summarises appointments, shows, and procedures ordered for the date range you choose. Click a card to jump into the matching patient list.',
  },
  {
    anchor: 'help-menu',
    placement: 'bottom',
    title: 'You are all set',
    body: 'That is the tour. You can restart it any time from this Help menu.',
  },
];
