/**
 * Helpers for keeping the raw "Patient Intake Notes" DOB line in sync with the
 * structured DOB on an appointment.
 *
 * Clinics read the raw notes text, so correcting only the structured DOB left a
 * stale "Date of Birth: 2026-03-05" visible in the portal.
 */

const DOB_LINE_RE = /^([ \t>*\-•]*)(date of birth|dob|birth date|birthdate)([ \t]*[:\-][ \t]*)(.*)$/gim;

/** Extract the DOB written in the raw intake notes, if any. */
export function extractDobFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const re = new RegExp(DOB_LINE_RE.source, 'im');
  const m = notes.match(re);
  const value = m?.[4]?.trim();
  return value ? value : null;
}

/**
 * Replace the DOB value in the raw intake notes with `newDob`.
 * Returns null when there is nothing to change (no line found, or already correct).
 */
export function rewriteDobInNotes(notes?: string | null, newDob?: string | null): string | null {
  if (!notes || !newDob) return null;
  DOB_LINE_RE.lastIndex = 0;
  const updated = notes.replace(DOB_LINE_RE, (_full, prefix, label, sep) => `${prefix}${label}${sep}${newDob}`);
  return updated !== notes ? updated : null;
}

/** True when a date string's year is the current year or later (impossible DOB). */
export function isImpossibleDobValue(raw?: string | null): boolean {
  const value = (raw || '').toString().trim();
  if (!value) return false;
  const parsed = new Date(value);
  const year = Number.isNaN(parsed.getTime())
    ? Number((value.match(/(19|20)\d{2}/) || [])[0])
    : parsed.getFullYear();
  if (!year) return false;
  return year >= new Date().getFullYear();
}
