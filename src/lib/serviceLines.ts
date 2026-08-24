import { supabase } from '@/integrations/supabase/client';

/** Service lines we always offer for a clinic, even with no matching appointments yet. */
const KNOWN_PROJECT_SERVICES: Record<string, string[]> = {
  'Texas Vascular Institute': ['GAE', 'PAD', 'PFE', 'UFE'],
  'Champion Heart and Vascular Center': ['GAE', 'HAE', 'PAE', 'PFE', 'UFE'],
  'ECCO Medical': ['GAE', 'PAE', 'PFE'],
};

const INVALID_SERVICE_TOKENS = new Set([
  'null', 'none', 'n/a', 'na', 'unknown', 'tbd', 'other', 'procedure',
  'procedures', 'consultation', 'consult', 'appointment', 'undefined', '-', '--',
]);

/**
 * Canonical service lines. Anything that doesn't normalize onto one of these
 * (e.g. TKR, FNA, "knee replacement surgery") is not a service line and is
 * never offered in a dropdown.
 */
export const CANONICAL_SERVICE_LINES = [
  'GAE', 'PAE', 'PFE', 'UFE', 'FSE', 'PAD', 'HAE', 'ATE', 'TAE', 'Neuropathy',
] as const;

const CANONICAL_BY_KEY = new Map<string, string>(
  CANONICAL_SERVICE_LINES.map((s) => [s.toLowerCase(), s]),
);
for (const list of Object.values(KNOWN_PROJECT_SERVICES)) {
  for (const s of list) if (!CANONICAL_BY_KEY.has(s.toLowerCase())) CANONICAL_BY_KEY.set(s.toLowerCase(), s);
}

/** Collapse variants onto their canonical service line (mirrors AppointmentFilters). */
export const normalizeServiceLine = (raw: string): string | null => {
  const value = (raw || '').trim();
  if (!value) return null;
  if (value.length > 60) return null;
  if (/[\n\r]/.test(value) || /https?:\/\//i.test(value)) return null;
  if (INVALID_SERVICE_TOKENS.has(value.toLowerCase())) return null;

  // Aliases / variants
  if (/^pae\b/i.test(value) && /bph/i.test(value)) return 'PAE';
  if (/^uae$/i.test(value)) return 'UFE';

  // Descriptive name with a parenthesised acronym, e.g. "Genicular Artery Embolization (GAE)"
  const paren = value.match(/\(([A-Za-z]{2,4})\)\s*$/);
  if (paren) {
    const canon = CANONICAL_BY_KEY.get(paren[1].toLowerCase());
    if (canon) return canon;
  }

  return CANONICAL_BY_KEY.get(value.toLowerCase()) ?? null;
};

/** True when a value is a recognised service line. */
export const isServiceLine = (raw: string): boolean => normalizeServiceLine(raw) !== null;


/** Service line of a single appointment row: parsed procedure first, calendar name fallback. */
export const serviceLineFromAppointment = (row: {
  parsed_pathology_info?: unknown;
  calendar_name?: string | null;
}): string | null => {
  const parsed = row.parsed_pathology_info as Record<string, unknown> | null;
  const parsedType = parsed && typeof parsed === 'object'
    ? ((parsed.procedure_type || parsed.procedure) as string | undefined)
    : undefined;
  if (typeof parsedType === 'string' && parsedType.trim()) return normalizeServiceLine(parsedType);

  const calendar = row.calendar_name || '';
  const match = calendar.match(/your\s+["']?([^"']+?)["']?\s+Consultation/i);
  if (match && match[1]) {
    const service = match[1]
      .trim()
      .replace(/^(?:virtual|in[-\s]?person)\s+/i, '')
      .replace(/\s+(?:virtual|in[-\s]?person)$/i, '')
      .trim();
    if (service && !/^(?:virtual|in[-\s]?person)$/i.test(service)) return normalizeServiceLine(service);
  }
  return null;
};

/** Distinct service lines seen for a clinic, plus its known service list. */
export const fetchServiceLines = async (projectName: string): Promise<string[]> => {
  const { data } = await supabase
    .from('all_appointments')
    .select('calendar_name, parsed_pathology_info')
    .eq('project_name', projectName)
    .order('created_at', { ascending: false })
    .limit(1500);

  const set = new Set<string>(KNOWN_PROJECT_SERVICES[projectName] || []);
  (data || []).forEach((row) => {
    const service = serviceLineFromAppointment(row as never);
    if (service) set.add(service);
  });
  return [...set].sort((a, b) => a.localeCompare(b));
};
