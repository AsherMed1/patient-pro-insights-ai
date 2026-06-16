// Shared helpers for applying patient search filters to appointment queries.
// Used by AllAppointmentsManager search across count / list / export queries.

type SearchType = 'name' | 'phone' | 'dob' | 'email';

// Convert various user inputs to an ISO date (YYYY-MM-DD) or null.
// Supports: YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY, MM-DD-YYYY
function toIsoDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const ymdSlash = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s);
  if (ymdSlash) {
    const [, y, m, d] = ymdSlash;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const mdy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

// Returns [start, end] year range or null. Supports a bare 4-digit year.
function toYearRange(raw: string): [string, string] | null {
  const s = raw.trim();
  if (/^\d{4}$/.test(s)) return [`${s}-01-01`, `${s}-12-31`];
  return null;
}

/**
 * Apply a patient search filter to a Supabase query builder.
 * Mutates and returns the same builder for chaining.
 */
export function applySearchFilter<T>(query: T, searchType: SearchType, rawTerm: string): T {
  const term = (rawTerm || '').trim();
  if (!term) return query;

  // Cast to any so we can call PostgREST builder methods generically.
  const q = query as any;

  if (searchType === 'name') {
    return q.ilike('lead_name', `%${term}%`);
  }

  if (searchType === 'email') {
    return q.ilike('lead_email', `%${term}%`);
  }

  if (searchType === 'phone') {
    // Match any contiguous digit substring against the normalized digits column.
    const digits = term.replace(/\D/g, '');
    if (!digits) {
      // User typed only punctuation/letters — return a query that yields nothing.
      return q.eq('id', '00000000-0000-0000-0000-000000000000');
    }
    return q.ilike('lead_phone_digits', `%${digits}%`);
  }

  if (searchType === 'dob') {
    const iso = toIsoDate(term);
    if (iso) return q.eq('dob', iso);
    const range = toYearRange(term);
    if (range) return q.gte('dob', range[0]).lte('dob', range[1]);
    // Unparseable DOB input — return empty set.
    return q.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  return query;
}
