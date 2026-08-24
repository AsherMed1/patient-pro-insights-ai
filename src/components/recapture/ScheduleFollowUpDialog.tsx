import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  FOLLOW_UP_INTERVALS, clinicLocalToUtc, clinicNow, formatClinicTime, timezoneLabel, toInputParts,
} from '@/lib/clinicTime';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Clinic timezone the follow-up is scheduled in. */
  timezone: string;
  saving?: boolean;
  initialNote?: string;
  /** Receives the exact UTC instant plus the clinic timezone and note. */
  onSchedule: (payload: { followUpAtIso: string; timezone: string; note: string }) => void;
}

/**
 * Follow-up scheduling in the clinic's local timezone. Quick intervals compute
 * from the current clinic-local time and pre-fill the editable fields.
 */
export default function ScheduleFollowUpDialog({
  open, onOpenChange, timezone, saving, initialNote, onSchedule,
}: Props) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [interval, setIntervalMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const parts = toInputParts(clinicNow(timezone));
    setDate(parts.date);
    setTime(parts.time);
    setNote(initialNote || '');
    setIntervalMinutes(null);
  }, [open, timezone, initialNote]);

  const applyInterval = (minutes: number) => {
    const target = new Date(clinicNow(timezone).getTime() + minutes * 60000);
    const parts = toInputParts(target);
    setDate(parts.date);
    setTime(parts.time);
    setIntervalMinutes(minutes);
  };

  const resolved = clinicLocalToUtc(date, time, timezone);

  const submit = () => {
    if (!resolved) {
      toast({ title: 'Pick a follow-up date and time', variant: 'destructive' });
      return;
    }
    onSchedule({ followUpAtIso: resolved.toISOString(), timezone, note: note.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle>Schedule Follow-Up</DialogTitle>
          <DialogDescription>
            The record stays active and moves to the Follow-Up bucket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Times shown in clinic local time — {timezoneLabel(timezone)}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quick follow-up</label>
            <div className="flex flex-wrap gap-2">
              {FOLLOW_UP_INTERVALS.map((i) => (
                <Button
                  key={i.minutes}
                  type="button"
                  size="sm"
                  variant={interval === i.minutes ? 'default' : 'outline'}
                  onClick={() => applyInterval(i.minutes)}
                >
                  {i.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Follow-up date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setIntervalMinutes(null); }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Follow-up time</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => { setTime(e.target.value); setIntervalMinutes(null); }}
              />
            </div>
          </div>

          <div className={cn('rounded-md border p-3 text-sm', !resolved && 'text-muted-foreground')}>
            {resolved ? (
              <>
                <span className="text-muted-foreground">Scheduled for </span>
                <Badge variant="secondary">{formatClinicTime(resolved, timezone)}</Badge>
              </>
            ) : (
              'Pick a date and time to see the exact follow-up moment.'
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Note (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Context for the follow-up..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !resolved}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Schedule Follow-Up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
