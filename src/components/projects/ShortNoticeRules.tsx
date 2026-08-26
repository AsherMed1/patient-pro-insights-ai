import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CANONICAL_SERVICE_LINES } from '@/lib/serviceLines';
import { extractLocationFromCalendarName } from '@/components/appointments/LocationLegend';

const LEGACY_LOCATIONS = ['Somerset, KY', 'Milledgeville', 'Somerset'];
const ANY_LOCATION = '__any__';

const HOUR_OPTIONS = [1, 12, 18, 24, 36, 48, 60, 72, 84, 120, 132, 168, 240, 252, 336];

interface RuleRow {
  id: string;
  project_name: string;
  service_line: string | null;
  location: string | null;
  threshold_hours: number;
  is_active: boolean;
}

interface Props {
  projectName: string;
  /** Account-level fallback shown at the bottom of the table. */
  defaultHours: number;
}

/**
 * Per-clinic notice rules: a clinic can require different notice by service
 * line, by location, or by both. The account-level value stays as the fallback.
 */
export const ShortNoticeRules: React.FC<Props> = ({ projectName, defaultHours }) => {
  const { toast } = useToast();
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [serviceLines, setServiceLines] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [hours, setHours] = useState('36');

  const load = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('project_short_notice_rules')
      .select('id, project_name, service_line, location, threshold_hours, is_active')
      .eq('project_name', projectName)
      .order('threshold_hours', { ascending: true });
    setLoading(false);
    if (error) {
      toast({ title: 'Could not load notice rules', description: error.message, variant: 'destructive' });
      return;
    }
    setRules((data || []) as RuleRow[]);
  }, [projectName, toast]);

  useEffect(() => { load(); }, [load]);

  // Locations detected from the project's calendars (same extraction as the calendar legend)
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    const fetchLocations = async () => {
      if (!projectName) return;
      const { data, error } = await supabase
        .from('all_appointments')
        .select('calendar_name, parsed_pathology_info')
        .eq('project_name', projectName)
        .not('calendar_name', 'is', null);
      if (error || cancelled) return;
      const unique = new Set<string>();
      (data || []).forEach((row: any) => {
        const loc = extractLocationFromCalendarName(
          row.calendar_name,
          row.parsed_pathology_info?.location,
        );
        if (!loc) return;
        if (LEGACY_LOCATIONS.some((legacy) => loc.includes(legacy))) return;
        unique.add(loc);
      });
      setLocationOptions(Array.from(unique).sort());
    };
    fetchLocations();
    return () => { cancelled = true; };
  }, [projectName]);

  const serviceLabel = useMemo(
    () => (serviceLines.length ? serviceLines.join(', ') : 'All service lines'),
    [serviceLines],
  );

  const addRule = async () => {
    const threshold = parseInt(hours, 10);
    if (!threshold || threshold <= 0) {
      toast({ title: 'Pick a required notice', variant: 'destructive' });
      return;
    }
    if (!serviceLines.length && !location.trim()) {
      toast({
        title: 'Scope the rule',
        description: 'Choose at least one service line or a location — the account default already covers everything else.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    const payload = (serviceLines.length ? serviceLines : [null]).map((sl) => ({
      project_name: projectName,
      service_line: sl,
      location: location.trim() || null,
      threshold_hours: threshold,
    }));
    // Replace any existing rule with the same scope, then insert
    for (const p of payload) {
      let del = supabase.from('project_short_notice_rules').delete().eq('project_name', p.project_name);
      del = p.service_line ? del.eq('service_line', p.service_line) : del.is('service_line', null);
      del = p.location ? del.eq('location', p.location) : del.is('location', null);
      await del;
    }
    const { error } = await supabase.from('project_short_notice_rules').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save rule', description: error.message, variant: 'destructive' });
      return;
    }
    setServiceLines([]); setLocation('');
    load();
  };

  const removeRule = async (id: string) => {
    const { error } = await supabase.from('project_short_notice_rules').delete().eq('id', id);
    if (error) {
      toast({ title: 'Could not delete rule', description: error.message, variant: 'destructive' });
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleActive = async (row: RuleRow) => {
    const { error } = await supabase
      .from('project_short_notice_rules')
      .update({ is_active: !row.is_active })
      .eq('id', row.id);
    if (error) {
      toast({ title: 'Could not update rule', description: error.message, variant: 'destructive' });
      return;
    }
    setRules((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)));
  };

  const updateHours = async (row: RuleRow, value: string) => {
    const threshold = parseInt(value, 10);
    if (!threshold) return;
    const { error } = await supabase
      .from('project_short_notice_rules')
      .update({ threshold_hours: threshold })
      .eq('id', row.id);
    if (error) {
      toast({ title: 'Could not update rule', description: error.message, variant: 'destructive' });
      return;
    }
    setRules((prev) => prev.map((r) => (r.id === row.id ? { ...r, threshold_hours: threshold } : r)));
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <Label className="text-sm font-medium">Notice rules (service line / location)</Label>
        <p className="text-xs text-muted-foreground">
          Rules override the default above. Most specific wins: service line + location, then service line, then location.
        </p>
      </div>

      <div className="space-y-2">
        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>}
        {!loading && rules.length === 0 && (
          <p className="text-sm text-muted-foreground">No rules yet — every appointment uses the default.</p>
        )}
        {rules.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded border px-2 py-1.5 text-sm">
            <Badge variant={r.service_line ? 'default' : 'outline'}>{r.service_line || 'Any service'}</Badge>
            <Badge variant={r.location ? 'secondary' : 'outline'}>{r.location || 'Any location'}</Badge>
            <Select value={String(r.threshold_hours)} onValueChange={(v) => updateHours(r, v)}>
              <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((h) => <SelectItem key={h} value={String(h)}>{h} hours</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="sm" onClick={() => toggleActive(r)}>
              {r.is_active ? 'Active' : 'Paused'}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRule(r.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="rounded border border-dashed px-2 py-1.5 text-sm text-muted-foreground">
          Account default — {defaultHours ? `${defaultHours} hours` : 'disabled'}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Service lines</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="h-9 w-[200px] justify-between font-normal">
                <span className="truncate">{serviceLabel}</span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-50 bg-popover">
              {CANONICAL_SERVICE_LINES.map((sl) => (
                <DropdownMenuCheckboxItem
                  key={sl}
                  checked={serviceLines.includes(sl)}
                  onCheckedChange={(checked) =>
                    setServiceLines((prev) => (checked ? [...prev, sl] : prev.filter((x) => x !== sl)))
                  }
                >
                  {sl}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Location (optional)</Label>
          <Input className="h-9 w-[180px]" value={location} placeholder="e.g. Bowling Green"
            onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Required notice</Label>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HOUR_OPTIONS.map((h) => <SelectItem key={h} value={String(h)}>{h} hours</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={addRule} disabled={saving} className="h-9">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
          Add rule
        </Button>
      </div>
    </div>
  );
};
