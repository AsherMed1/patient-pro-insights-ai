import { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useMentionableUsers, type MentionableUser } from '@/hooks/useMentionableUsers';
import { buildMentionToken } from '@/lib/mentions';

interface MentionTextareaProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * Textarea with an "@" teammate picker. Selected teammates are stored in the
 * text as `@[Full Name](user-uuid)` tokens.
 */
export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  disabled,
}: MentionTextareaProps) {
  const { users, error, loading } = useMentionableUsers();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [triggerIndex, setTriggerIndex] = useState<number | null>(null);
  const [highlight, setHighlight] = useState(0);

  const matches = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return users
      .filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [query, users]);

  useEffect(() => { setHighlight(0); }, [query]);

  const closePicker = () => { setQuery(null); setTriggerIndex(null); };

  const syncPicker = (text: string, caret: number) => {
    const upto = text.slice(0, caret);
    const at = upto.lastIndexOf('@');
    if (at === -1) return closePicker();
    const before = at === 0 ? '' : upto[at - 1];
    if (before && !/\s/.test(before)) return closePicker();
    const fragment = upto.slice(at + 1);
    if (/[\n\]]/.test(fragment) || fragment.length > 30) return closePicker();
    setTriggerIndex(at);
    setQuery(fragment);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
    syncPicker(text, e.target.selectionStart ?? text.length);
  };

  const select = (u: MentionableUser) => {
    if (triggerIndex === null) return;
    const caret = ref.current?.selectionStart ?? value.length;
    // Group entries (@AM, @Tech) expand into a token per member.
    const tokens = (u.members && u.members.length > 0 ? u.members : [u])
      .map((m) => buildMentionToken(m.name, m.id))
      .join(' ');
    const next = `${value.slice(0, triggerIndex)}${tokens} ${value.slice(caret)}`;
    onChange(next);
    closePicker();
    setTimeout(() => ref.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (query === null || matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      select(matches[highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePicker();
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(closePicker, 150)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={className}
      />
      {query !== null && matches.length > 0 && (
        <div className="absolute z-50 mt-1 w-72 overflow-hidden rounded-md border bg-popover shadow-md">
          {matches.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(u)}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                'flex w-full flex-col items-start px-3 py-1.5 text-left text-sm',
                i === highlight && 'bg-accent',
              )}
            >
              <span className="font-medium">{u.name}</span>
              <span className="text-xs text-muted-foreground">{u.email} • {u.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
