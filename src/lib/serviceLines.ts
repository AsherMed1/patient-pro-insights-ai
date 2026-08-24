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

/** Collapse variants onto their canonical service line (mirrors AppointmentFilters). */
export const normalizeServiceLine = (raw: string): string | null => {
  const value = (raw || '').trim();
  if (!value) return null;
  if (value.length > 30) return null;
  if (/[\n\r]/.test(value) || /https?:\/\//i.test(value)) return null;
  if (INVALID_SERVICE_TOKENS.has(value.toLowerCase())) return null;
  if (/^pae\b/i.test(value) && /bph/i.test(value)) return 'PAE';
  if (/^uae$/i.test(value)) return 'UFE';
  if (/^[a-z]{2,4}$/i.test(value)) return value.toUpperCase();
  return value;
};

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
