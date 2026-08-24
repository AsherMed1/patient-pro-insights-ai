/**
 * Shared note presentation rules so the patient portal and the Recapture
 * drawer classify and colour notes identically.
 *
 * Colour is never the only signal — every note also renders an explicit
 * PPM / Clinic / System label.
 */

export type NoteAuthorType = 'ppm' | 'clinic' | 'system';

const PPM_DOMAINS = ['patientpromarketing.com', 'patientproclients.com'];

const SYSTEM_AUTHORS = [
  'system',
  'portal system',
  'automation',
  'support',
  'ghl',
  'gohighlevel',
];

/** Who wrote a note: PPM staff, the clinic, or the platform itself. */
export function classifyNoteAuthor(createdBy?: string | null): NoteAuthorType {
  const raw = (createdBy || '').trim().toLowerCase();
  if (!raw) return 'system';
  if (SYSTEM_AUTHORS.some((s) => raw === s || raw.startsWith(`${s} `) || raw.includes(`(${s})`))) {
    return 'system';
  }
  if (PPM_DOMAINS.some((d) => raw.includes(d))) return 'ppm';
  // Non-PPM email address → clinic user.
  if (raw.includes('@')) return 'clinic';
  // Bare display names belong to Portal (PPM) staff attribution.
  return 'ppm';
}

export const NOTE_AUTHOR_LABELS: Record<NoteAuthorType, string> = {
  ppm: 'PPM',
  clinic: 'Clinic',
  system: 'System',
};

/** Container classes per author type (semantic tokens only). */
export const NOTE_AUTHOR_CLASSES: Record<NoteAuthorType, string> = {
  ppm: 'border-primary/40 bg-primary/5',
  clinic: 'border-border bg-card',
  system: 'border-emerald-800/40 bg-emerald-950/10 dark:bg-emerald-950/30',
};

/** Badge classes per author type. */
export const NOTE_AUTHOR_BADGE_CLASSES: Record<NoteAuthorType, string> = {
  ppm: 'border-primary/40 bg-primary/10 text-primary',
  clinic: 'border-border bg-muted text-muted-foreground',
  system: 'border-emerald-800/40 bg-emerald-900/10 text-emerald-800 dark:text-emerald-300',
};

/**
 * Technical GHL tagging chatter that carries no operational meaning for
 * setters or clinics. Still written to the database for troubleshooting —
 * only hidden from the notes / activity view.
 */
const GHL_TAG_NOISE_PATTERNS: RegExp[] = [
  /\bghl\b[^.\n]{0,40}\btags?\s+(applied|removed|synced|updated)\b/i,
  /^\s*ghl\s+tags?\b/i,
  /\btags?\s+(applied|removed)\s+in\s+ghl\b/i,
  /\bghl\s+(dnd|do not disturb)\s+(applied|set|synced)\b/i,
];

export function isGhlTagNoise(noteText?: string | null): boolean {
  const text = (noteText || '').trim();
  if (!text) return false;
  return GHL_TAG_NOISE_PATTERNS.some((re) => re.test(text));
}

/** Drop technical GHL tag events from a user-facing notes/activity list. */
export function withoutGhlTagNoise<T extends { note_text?: string | null; note?: string | null }>(
  rows: T[],
): T[] {
  return rows.filter((r) => !isGhlTagNoise(r.note_text ?? r.note ?? ''));
}
