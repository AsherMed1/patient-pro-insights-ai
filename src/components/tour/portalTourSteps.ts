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
  /** Highlight several elements at once (e.g. related toolbar controls). */
  anchors?: string[];
  title: string;
  body: string;
  /** Optional bullet list rendered under the intro body. */
  bullets?: string[];
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
    body: 'Appointments are organized by status: New — newly submitted appointments not yet reviewed. Needs Review — appointments requiring action or missing required information. Upcoming — reviewed appointments with a future date. Completed — appointments that have passed or been completed. All — every appointment in one place.',
  },
  {
    anchor: 'status-dropdown',
    section: 'appointments-list',
    placement: 'bottom',
    title: 'Understanding statuses',
    body: 'Use this Status dropdown to set Confirmed (booked), Showed (attended), Cancelled, No Show, Rescheduled, or OON (out of network). Changing it here keeps the record and our team in sync.',
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
    anchor: 'pro-insights',
    section: 'appointments-list',
    placement: 'top',
    title: 'Patient Pro Insights',
    body: "Click the Patient Pro Insights tab to expand or collapse the patient's medical, insurance, and demographic information.",
  },
  {
    anchor: 'internal-notes',
    section: 'appointments-list',
    placement: 'bottom',
    title: 'Updating and adding notes',
    body: 'Internal Notes live at the bottom of each patient record. Use Add Note for anything our team should know — notes are shared with us and kept with the appointment.',
  },
  {
    anchor: 'welcome-call-attempt',
    section: 'appointments-list',
    placement: 'bottom',
    title: 'Logging a Welcome Call',
    body: 'Select Welcome Call Attempt in the notes header. Choose Patient Answered or Patient Did Not Answer, add the required internal note, and save.',
    bullets: [
      'Patient Answered: Marks the patient as successfully reached.',
      'Patient Did Not Answer: Keeps the record open and sends the patient follow-up text, limited to once every 12 hours.',
    ],
  },
  {
    anchors: ['view-toggle', 'calendar-view-mode', 'reserve-time'],
    section: 'appointments-calendar',
    placement: 'bottom',
    title: 'Calendar view',
    body: 'Switch between the list and calendar on the left, choose Day, Week, or Month at the top, and use Reserve Time to block out time so we do not book into it.',
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
