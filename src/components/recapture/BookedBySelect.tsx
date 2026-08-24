import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SetterOption {
  id: string;
  name: string;
  email: string;
}

/** Roles that identify a setter in the Portal. */
const SETTER_ROLES = ['review_only', 'recapture', 'agent', 'admin'];

let cachedSetters: SetterOption[] | null = null;

export function useSetterUsers() {
  const [setters, setSetters] = useState<SetterOption[]>(cachedSetters || []);
  const [loading, setLoading] = useState(!cachedSetters);

  useEffect(() => {
    if (cachedSetters) return;
    let cancelled = false;
    (async () => {
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', SETTER_ROLES as any);
      const ids = Array.from(new Set(((roleRows as any[]) || []).map((r) => r.user_id)));
      if (ids.length === 0) {
        if (!cancelled) { setSetters([]); setLoading(false); }
        return;
      }
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      const list: SetterOption[] = ((profs as any[]) || [])
        .map((p) => ({ id: p.id, name: p.full_name || p.email || 'Unknown user', email: p.email || '' }))
        .sort((a, b) => a.name.localeCompare(b.name));
      cachedSetters = list;
      if (!cancelled) { setSetters(list); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return { setters, loading };
}

interface Props {
  value: string;
  onChange: (userId: string, name: string) => void;
  disabled?: boolean;
}

/** Searchable dropdown of active setter-role users. */
export default function BookedBySelect({ value, onChange, disabled }: Props) {
  const { setters, loading } = useSetterUsers();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => setters.find((s) => s.id === value), [setters, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {loading ? (
            <span className="flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading setters…
            </span>
          ) : (
            <span className={cn(!selected && 'text-muted-foreground')}>
              {selected ? selected.name : 'Select setter'}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search setters…" />
          <CommandList>
            <CommandEmpty>No setter found.</CommandEmpty>
            <CommandGroup>
              {setters.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.name} ${s.email}`}
                  onSelect={() => { onChange(s.id, s.name); setOpen(false); }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === s.id ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex flex-col">
                    <span>{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
