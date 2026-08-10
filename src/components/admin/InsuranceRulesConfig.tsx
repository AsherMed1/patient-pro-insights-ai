import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';
import { evaluateRules, type BlockRule, type MatchMethod, type RuleType } from '@/lib/oonMatching';

interface CanonicalPlan { id: string; canonical_name: string; }
interface PlanAlias { id: string; plan_id: string; alias: string; }
interface RuleScope { id: string; rule_id: string; project_name: string | null; location: string | null; calendar_name: string | null; }
interface RuleRow {
  id: string; rule_type: RuleType; plan_id: string | null; value: string | null;
  match_method: MatchMethod; is_active: boolean; note: string | null;
}

const MATCH_METHODS: MatchMethod[] = ['exact', 'prefix', 'contains', 'regex'];

const InsuranceRulesConfig = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<CanonicalPlan[]>([]);
  const [aliases, setAliases] = useState<PlanAlias[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [scopes, setScopes] = useState<RuleScope[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [newPlan, setNewPlan] = useState('');
  const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({});
  const [ruleType, setRuleType] = useState<RuleType>('plan');
  const [rulePlanId, setRulePlanId] = useState<string>('');
  const [ruleValue, setRuleValue] = useState('');
  const [ruleMethod, setRuleMethod] = useState<MatchMethod>('contains');
  const [ruleNote, setRuleNote] = useState('');
  const [ruleProject, setRuleProject] = useState<string>('__all__');
  const [ruleLocation, setRuleLocation] = useState('');

  // tester state
  const [testProject, setTestProject] = useState<string>('__all__');
  const [testLocation, setTestLocation] = useState('');
  const [testPlan, setTestPlan] = useState('');
  const [testGroup, setTestGroup] = useState('');

  const loadAll = async () => {
    setLoading(true);
    const [p, a, r, s, proj] = await Promise.all([
      supabase.from('insurance_canonical_plans').select('*').order('canonical_name'),
      supabase.from('insurance_plan_aliases').select('*').order('alias'),
      supabase.from('insurance_block_rules').select('*').order('created_at', { ascending: false }),
      supabase.from('insurance_block_rule_scopes').select('*'),
      supabase.from('projects').select('project_name').order('project_name'),
    ]);
    setPlans((p.data as CanonicalPlan[]) || []);
    setAliases((a.data as PlanAlias[]) || []);
    setRules((r.data as RuleRow[]) || []);
    setScopes((s.data as RuleScope[]) || []);
    setProjects(((proj.data as { project_name: string }[]) || []).map((x) => x.project_name).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const planNameById = useMemo(() => {
    const m = new Map<string, string>();
    plans.forEach((p) => m.set(p.id, p.canonical_name));
    return m;
  }, [plans]);

  const compiledRules = useMemo<BlockRule[]>(() => {
    const termsByPlan = new Map<string, string[]>();
    plans.forEach((p) => termsByPlan.set(p.id, [p.canonical_name]));
    aliases.forEach((a) => termsByPlan.get(a.plan_id)?.push(a.alias));
    const scopesByRule = new Map<string, RuleScope[]>();
    scopes.forEach((s) => {
      const list = scopesByRule.get(s.rule_id) || [];
      list.push(s);
      scopesByRule.set(s.rule_id, list);
    });
    return rules.map((r) => ({
      ...r,
      planName: r.plan_id ? planNameById.get(r.plan_id) ?? null : null,
      planTerms: r.plan_id ? termsByPlan.get(r.plan_id) ?? [] : r.value ? [r.value] : [],
      scopes: (scopesByRule.get(r.id) || []).map((s) => ({
        project_name: s.project_name, location: s.location, calendar_name: s.calendar_name,
      })),
    }));
  }, [rules, plans, aliases, scopes, planNameById]);

  const testMatches = useMemo(() => {
    if (!testPlan.trim() && !testGroup.trim()) return [];
    return evaluateRules(compiledRules, {
      projectName: testProject === '__all__' ? null : testProject,
      location: testLocation || null,
      calendarName: testLocation || null,
      plans: [testPlan],
      groupNumbers: [testGroup],
    });
  }, [compiledRules, testProject, testLocation, testPlan, testGroup]);

  const addPlan = async () => {
    if (!newPlan.trim()) return;
    const { error } = await supabase.from('insurance_canonical_plans').insert({ canonical_name: newPlan.trim() });
    if (error) return toast({ title: 'Could not add plan', description: error.message, variant: 'destructive' });
    setNewPlan('');
    loadAll();
  };

  const addAlias = async (planId: string) => {
    const alias = (aliasDrafts[planId] || '').trim();
    if (!alias) return;
    const { error } = await supabase.from('insurance_plan_aliases').insert({ plan_id: planId, alias });
    if (error) return toast({ title: 'Could not add alias', description: error.message, variant: 'destructive' });
    setAliasDrafts((d) => ({ ...d, [planId]: '' }));
    loadAll();
  };

  const deleteRow = async (table: 'insurance_canonical_plans' | 'insurance_plan_aliases' | 'insurance_block_rules', id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    loadAll();
  };

  const addRule = async () => {
    if (ruleType === 'plan' && !rulePlanId) {
      return toast({ title: 'Pick a canonical plan', variant: 'destructive' });
    }
    if (ruleType === 'group' && !ruleValue.trim()) {
      return toast({ title: 'Enter a group number pattern', variant: 'destructive' });
    }
    const { data, error } = await supabase.from('insurance_block_rules').insert({
      rule_type: ruleType,
      plan_id: ruleType === 'plan' ? rulePlanId : null,
      value: ruleType === 'group' ? ruleValue.trim() : (ruleValue.trim() || null),
      match_method: ruleMethod,
      is_active: true,
      note: ruleNote.trim() || null,
    }).select().single();
    if (error) return toast({ title: 'Could not add rule', description: error.message, variant: 'destructive' });

    if (ruleProject !== '__all__' || ruleLocation.trim()) {
      const { error: sErr } = await supabase.from('insurance_block_rule_scopes').insert({
        rule_id: data.id,
        project_name: ruleProject === '__all__' ? null : ruleProject,
        location: ruleLocation.trim() || null,
      });
      if (sErr) toast({ title: 'Rule saved, scope failed', description: sErr.message, variant: 'destructive' });
    }
    setRuleValue(''); setRuleNote(''); setRuleLocation('');
    loadAll();
    toast({ title: 'Rule added' });
  };

  const toggleRule = async (rule: RuleRow) => {
    const { error } = await supabase.from('insurance_block_rules')
      .update({ is_active: !rule.is_active }).eq('id', rule.id);
    if (error) return toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)));
  };

  const scopeLabel = (ruleId: string) => {
    const list = scopes.filter((s) => s.rule_id === ruleId);
    if (!list.length) return 'All clinics';
    return list.map((s) => [s.project_name, s.location, s.calendar_name].filter(Boolean).join(' · ')).join(' | ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          Potential OON Insurance Rules
        </CardTitle>
        <CardDescription>
          Flag appointments whose insurance plan or group number is likely out-of-network before they reach clinics.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Canonical plans</TabsTrigger>
            <TabsTrigger value="rules">Block rules</TabsTrigger>
            <TabsTrigger value="tester">Rule tester</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4 pt-4">
            <div className="flex gap-2 max-w-xl">
              <Input placeholder="Canonical plan name (e.g. Ambetter)" value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)} />
              <Button onClick={addPlan}><Plus className="h-4 w-4 mr-1" />Add plan</Button>
            </div>
            <div className="space-y-3">
              {plans.map((p) => (
                <div key={p.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.canonical_name}</span>
                    <Button variant="ghost" size="sm" onClick={() => deleteRow('insurance_canonical_plans', p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aliases.filter((a) => a.plan_id === p.id).map((a) => (
                      <Badge key={a.id} variant="secondary" className="gap-1">
                        {a.alias}
                        <button className="ml-1 opacity-60 hover:opacity-100"
                          onClick={() => deleteRow('insurance_plan_aliases', a.id)}>×</button>
                      </Badge>
                    ))}
                    {aliases.filter((a) => a.plan_id === p.id).length === 0 && (
                      <span className="text-xs text-muted-foreground">No aliases yet</span>
                    )}
                  </div>
                  <div className="flex gap-2 max-w-md">
                    <Input placeholder="Add alias / spelling variant"
                      value={aliasDrafts[p.id] || ''}
                      onChange={(e) => setAliasDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') addAlias(p.id); }} />
                    <Button variant="outline" onClick={() => addAlias(p.id)}>Add</Button>
                  </div>
                </div>
              ))}
              {!loading && plans.length === 0 && (
                <p className="text-sm text-muted-foreground">No canonical plans configured yet.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-3 border rounded-md p-3">
              <div className="space-y-1">
                <Label>Rule type</Label>
                <Select value={ruleType} onValueChange={(v) => setRuleType(v as RuleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan">Plan name</SelectItem>
                    <SelectItem value="group">Group number</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {ruleType === 'plan' ? (
                <div className="space-y-1">
                  <Label>Canonical plan</Label>
                  <Select value={rulePlanId} onValueChange={setRulePlanId}>
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.canonical_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>Group number pattern</Label>
                  <Input value={ruleValue} onChange={(e) => setRuleValue(e.target.value)} placeholder="e.g. 12345" />
                </div>
              )}
              <div className="space-y-1">
                <Label>Match method</Label>
                <Select value={ruleMethod} onValueChange={(v) => setRuleMethod(v as MatchMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MATCH_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Clinic scope</Label>
                <Select value={ruleProject} onValueChange={setRuleProject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All clinics</SelectItem>
                    {projects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Location contains (optional)</Label>
                <Input value={ruleLocation} onChange={(e) => setRuleLocation(e.target.value)} placeholder="e.g. Macon" />
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input value={ruleNote} onChange={(e) => setRuleNote(e.target.value)} placeholder="Why this is OON" />
              </div>
              <div className="md:col-span-3">
                <Button onClick={addRule}><Plus className="h-4 w-4 mr-1" />Add rule</Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="capitalize">{r.rule_type}</TableCell>
                    <TableCell>{r.plan_id ? planNameById.get(r.plan_id) : r.value}</TableCell>
                    <TableCell>{r.match_method}</TableCell>
                    <TableCell className="text-xs">{scopeLabel(r.id)}</TableCell>
                    <TableCell className="text-xs">{r.note || '—'}</TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggleRule(r)} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteRow('insurance_block_rules', r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && rules.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No rules configured.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="tester" className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label>Clinic</Label>
                <Select value={testProject} onValueChange={setTestProject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any clinic</SelectItem>
                    {projects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Location / calendar</Label>
                <Input value={testLocation} onChange={(e) => setTestLocation(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Insurance plan</Label>
                <Input value={testPlan} onChange={(e) => setTestPlan(e.target.value)} placeholder="e.g. Ambetter Superior" />
              </div>
              <div className="space-y-1">
                <Label>Group number</Label>
                <Input value={testGroup} onChange={(e) => setTestGroup(e.target.value)} />
              </div>
            </div>
            {(testPlan.trim() || testGroup.trim()) && (
              testMatches.length ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-1">
                  <p className="font-medium text-amber-800">Would be flagged as Potential OON</p>
                  {testMatches.map((m) => (
                    <p key={m.rule_id} className="text-sm text-amber-800">
                      {m.matched_on === 'group' ? 'Group #' : 'Plan'} “{m.matched_value}” matched
                      {m.plan_name ? ` ${m.plan_name}` : ''} via {m.match_method} “{m.matched_term}”
                      {m.note ? ` — ${m.note}` : ''}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
                  No rule matches — this appointment would pass through normally.
                </div>
              )
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InsuranceRulesConfig;
