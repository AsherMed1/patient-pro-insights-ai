// Shared Potential-OON insurance matching logic (Deno / edge functions).
// Keep in sync with src/lib/oonMatching.ts (browser copy used by the Rule Tester).

export type MatchMethod = 'exact' | 'prefix' | 'contains' | 'regex';
export type RuleType = 'plan' | 'group';

export interface BlockRuleScope {
  project_name?: string | null;
  location?: string | null;
  calendar_name?: string | null;
}

export interface BlockRule {
  id: string;
  rule_type: RuleType;
  plan_id?: string | null;
  value?: string | null;
  match_method: MatchMethod;
  is_active: boolean;
  note?: string | null;
  scopes?: BlockRuleScope[];
  // Resolved plan info (canonical name + aliases) for plan rules
  planName?: string | null;
  planTerms?: string[];
}

export interface AppointmentInsuranceInput {
  projectName?: string | null;
  location?: string | null;
  calendarName?: string | null;
  plans: (string | null | undefined)[];
  groupNumbers: (string | null | undefined)[];
}

export interface OonMatch {
  rule_id: string;
  rule_type: RuleType;
  match_method: MatchMethod;
  matched_on: 'plan' | 'group';
  matched_value: string;
  matched_term: string;
  plan_name?: string | null;
  note?: string | null;
}

/** Lowercase, strip punctuation/extra whitespace. Used for plan names. */
export function normalizePlan(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Lowercase, strip everything that is not alphanumeric. Used for group numbers. */
export function normalizeGroup(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function testTerm(method: MatchMethod, subject: string, term: string): boolean {
  if (!subject || !term) return false;
  switch (method) {
    case 'exact':
      return subject === term;
    case 'prefix':
      return subject.startsWith(term);
    case 'contains':
      return subject.includes(term);
    case 'regex':
      try {
        return new RegExp(term, 'i').test(subject);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function scopeMatches(rule: BlockRule, input: AppointmentInsuranceInput): boolean {
  const scopes = rule.scopes ?? [];
  if (scopes.length === 0) return true; // global rule
  const project = normalizePlan(input.projectName);
  const location = normalizePlan(input.location);
  const calendar = normalizePlan(input.calendarName);
  return scopes.some((s) => {
    if (s.project_name && normalizePlan(s.project_name) !== project) return false;
    if (s.location && !location.includes(normalizePlan(s.location))) return false;
    if (s.calendar_name && !calendar.includes(normalizePlan(s.calendar_name))) return false;
    return true;
  });
}

/** Evaluate an appointment's insurance values against the active block rules. */
export function evaluateRules(
  rules: BlockRule[],
  input: AppointmentInsuranceInput,
): OonMatch[] {
  const matches: OonMatch[] = [];
  const plans = (input.plans || []).filter(Boolean) as string[];
  const groups = (input.groupNumbers || []).filter(Boolean) as string[];

  for (const rule of rules) {
    if (!rule.is_active) continue;
    if (!scopeMatches(rule, input)) continue;

    if (rule.rule_type === 'plan') {
      const terms = (rule.planTerms && rule.planTerms.length
        ? rule.planTerms
        : [rule.value || '']
      )
        .map((t) => (rule.match_method === 'regex' ? String(t) : normalizePlan(t)))
        .filter(Boolean);
      for (const raw of plans) {
        const subject = rule.match_method === 'regex' ? raw : normalizePlan(raw);
        const hit = terms.find((t) => testTerm(rule.match_method, subject, t));
        if (hit) {
          matches.push({
            rule_id: rule.id,
            rule_type: 'plan',
            match_method: rule.match_method,
            matched_on: 'plan',
            matched_value: raw,
            matched_term: hit,
            plan_name: rule.planName ?? null,
            note: rule.note ?? null,
          });
          break;
        }
      }
    } else {
      const term = rule.match_method === 'regex' ? String(rule.value || '') : normalizeGroup(rule.value);
      if (!term) continue;
      for (const raw of groups) {
        const subject = rule.match_method === 'regex' ? raw : normalizeGroup(raw);
        if (testTerm(rule.match_method, subject, term)) {
          matches.push({
            rule_id: rule.id,
            rule_type: 'group',
            match_method: rule.match_method,
            matched_on: 'group',
            matched_value: raw,
            matched_term: term,
            plan_name: rule.planName ?? null,
            note: rule.note ?? null,
          });
          break;
        }
      }
    }
  }
  return matches;
}

/** Load every active rule with its plan terms and scopes. */
export async function loadBlockRules(supabase: any): Promise<BlockRule[]> {
  const [{ data: rules }, { data: plans }, { data: aliases }, { data: scopes }] = await Promise.all([
    supabase.from('insurance_block_rules').select('*').eq('is_active', true),
    supabase.from('insurance_canonical_plans').select('id, canonical_name'),
    supabase.from('insurance_plan_aliases').select('plan_id, alias'),
    supabase.from('insurance_block_rule_scopes').select('rule_id, project_name, location, calendar_name'),
  ]);

  const planById = new Map<string, { name: string; terms: string[] }>();
  for (const p of plans || []) planById.set(p.id, { name: p.canonical_name, terms: [p.canonical_name] });
  for (const a of aliases || []) {
    const entry = planById.get(a.plan_id);
    if (entry) entry.terms.push(a.alias);
  }

  const scopesByRule = new Map<string, BlockRuleScope[]>();
  for (const s of scopes || []) {
    const list = scopesByRule.get(s.rule_id) || [];
    list.push({ project_name: s.project_name, location: s.location, calendar_name: s.calendar_name });
    scopesByRule.set(s.rule_id, list);
  }

  return (rules || []).map((r: any) => {
    const plan = r.plan_id ? planById.get(r.plan_id) : null;
    return {
      ...r,
      planName: plan?.name ?? null,
      planTerms: plan?.terms ?? (r.value ? [r.value] : []),
      scopes: scopesByRule.get(r.id) || [],
    } as BlockRule;
  });
}

/** Pull every candidate plan / group value out of an appointment row. */
export function extractInsuranceValues(appt: any): { plans: string[]; groupNumbers: string[] } {
  const ins = (appt?.parsed_insurance_info || {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const plans = [
    str(ins.insurance_plan),
    str(ins.insurance_provider),
    str(ins.plan_name),
    str(ins.plan),
    str(ins.provider),
    str(ins.alternate_selection),
    str(ins.secondary_plan),
    str(ins.secondary_provider),
    str(ins.secondary_insurance),
    str(appt?.insurance_provider),
    str(appt?.insurance_plan),
  ].filter(Boolean) as string[];
  const groupNumbers = [
    str(ins.insurance_group_number),
    str(ins.group_number),
    str(ins.secondary_group_number),
    str(appt?.group_number),
  ].filter(Boolean) as string[];
  return { plans: [...new Set(plans)], groupNumbers: [...new Set(groupNumbers)] };
}
