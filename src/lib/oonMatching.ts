// Browser copy of the Potential-OON matching logic, used by the admin Rule Tester.
// Keep in sync with supabase/functions/_shared/oon-matcher.ts

export type MatchMethod = 'exact' | 'prefix' | 'contains' | 'regex';
export type RuleType = 'plan' | 'group_number';

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
  planName?: string | null;
  planTerms?: string[];
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

export interface MatchInput {
  projectName?: string | null;
  location?: string | null;
  calendarName?: string | null;
  plans: (string | null | undefined)[];
  groupNumbers: (string | null | undefined)[];
}

export function normalizePlan(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function normalizeGroup(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function testTerm(method: MatchMethod, subject: string, term: string): boolean {
  if (!subject || !term) return false;
  switch (method) {
    case 'exact': return subject === term;
    case 'prefix': return subject.startsWith(term);
    case 'contains': return subject.includes(term);
    case 'regex':
      try { return new RegExp(term, 'i').test(subject); } catch { return false; }
    default: return false;
  }
}

function scopeMatches(rule: BlockRule, input: MatchInput): boolean {
  const scopes = rule.scopes ?? [];
  if (scopes.length === 0) return true;
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

export function evaluateRules(rules: BlockRule[], input: MatchInput): OonMatch[] {
  const matches: OonMatch[] = [];
  const plans = (input.plans || []).filter(Boolean) as string[];
  const groups = (input.groupNumbers || []).filter(Boolean) as string[];

  for (const rule of rules) {
    if (!rule.is_active) continue;
    if (!scopeMatches(rule, input)) continue;

    if (rule.rule_type === 'plan') {
      const terms = (rule.planTerms && rule.planTerms.length ? rule.planTerms : [rule.value || ''])
        .map((t) => (rule.match_method === 'regex' ? String(t) : normalizePlan(t)))
        .filter(Boolean);
      for (const raw of plans) {
        const subject = rule.match_method === 'regex' ? raw : normalizePlan(raw);
        const hit = terms.find((t) => testTerm(rule.match_method, subject, t));
        if (hit) {
          matches.push({
            rule_id: rule.id, rule_type: 'plan', match_method: rule.match_method,
            matched_on: 'plan', matched_value: raw, matched_term: hit,
            plan_name: rule.planName ?? null, note: rule.note ?? null,
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
            rule_id: rule.id, rule_type: 'group_number', match_method: rule.match_method,
            matched_on: 'group', matched_value: raw, matched_term: term,
            plan_name: rule.planName ?? null, note: rule.note ?? null,
          });
          break;
        }
      }
    }
  }
  return matches;
}
