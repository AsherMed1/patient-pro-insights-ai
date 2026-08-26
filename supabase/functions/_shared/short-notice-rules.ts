// Per-clinic short-notice rules (service line / location overrides).
// Mirror of resolveShortNoticeThreshold in src/lib/shortNotice.ts — keep in sync.

export interface ShortNoticeRule {
  id?: string;
  project_name?: string | null;
  service_line?: string | null;
  location?: string | null;
  threshold_hours: number;
  is_active?: boolean | null;
  note?: string | null;
}

export interface ShortNoticeRuleInput {
  serviceLine?: string | null;
  location?: string | null;
  calendarName?: string | null;
}

export interface ResolvedShortNotice {
  thresholdHours: number;
  rule: ShortNoticeRule | null;
  serviceLine: string | null;
  location: string | null;
}

const normalizeToken = (value: unknown): string =>
  typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : '';

/** Procedure guess for a row: parsed procedure first, then the calendar name. */
export function serviceLineForRow(row: {
  parsed_pathology_info?: unknown;
  calendar_name?: string | null;
}): string | null {
  const parsed = row.parsed_pathology_info as Record<string, unknown> | null;
  const parsedType = parsed && typeof parsed === 'object'
    ? ((parsed.procedure_type || parsed.procedure) as string | undefined)
    : undefined;
  if (typeof parsedType === 'string' && parsedType.trim()) return parsedType.trim();
  return row.calendar_name || null;
}

export function resolveShortNoticeThreshold(
  rules: ShortNoticeRule[] | null | undefined,
  input: ShortNoticeRuleInput,
  accountDefault: number,
): ResolvedShortNotice {
  const service = normalizeToken(input.serviceLine);
  const calendar = normalizeToken(input.calendarName);
  const location = normalizeToken(input.location) || calendar;

  let best: { rule: ShortNoticeRule; score: number } | null = null;

  for (const rule of rules || []) {
    if (rule.is_active === false) continue;
    if (!rule.threshold_hours || rule.threshold_hours <= 0) continue;

    let score = 0;
    if (rule.service_line) {
      const term = normalizeToken(rule.service_line);
      const hit = (service && (service === term || service.includes(term))) || (calendar && calendar.includes(term));
      if (!hit) continue;
      score += 2;
    }
    if (rule.location) {
      const term = normalizeToken(rule.location);
      if (!term) continue;
      if (!location.includes(term) && !calendar.includes(term)) continue;
      score += 1;
    }
    if (score === 0) continue;

    if (!best || score > best.score || (score === best.score && rule.threshold_hours < best.rule.threshold_hours)) {
      best = { rule, score };
    }
  }

  return {
    thresholdHours: best ? best.rule.threshold_hours : accountDefault,
    rule: best?.rule ?? null,
    serviceLine: input.serviceLine || null,
    location: input.location || input.calendarName || null,
  };
}
