import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  ALLOW_RESCHEDULE_REASON_OPTIONS,
  NO_RESCHEDULE_REASON_OPTIONS,
  reasonRequiresNotes,
} from './cancellationReasons';

interface NoShowEligibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName?: string | null;
  submitting?: boolean;
  onConfirm: (eligible: boolean, notes: string, reason?: string | null) => void | Promise<void>;
}

const NO_REASON = '__none__';

const NoShowEligibilityDialog = ({
  open,
  onOpenChange,
  patientName,
  submitting = false,
  onConfirm,
}: NoShowEligibilityDialogProps) => {
  const [eligible, setEligible] = useState<'yes' | 'no'>('yes');
  const [reason, setReason] = useState<string>(NO_REASON);
  const [notes, setNotes] = useState('');

  const reset = () => {
    setEligible('yes');
    setReason(NO_REASON);
    setNotes('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const options =
    eligible === 'yes' ? ALLOW_RESCHEDULE_REASON_OPTIONS : NO_RESCHEDULE_REASON_OPTIONS;

  const selectedReason = reason === NO_REASON ? null : reason;
  const notesRequired = !!selectedReason && reasonRequiresNotes(selectedReason);
  const canSubmit = !submitting && (!notesRequired || notes.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as No Show</DialogTitle>
          <DialogDescription>
            Should {patientName || 'this patient'} be rescheduled?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup
            value={eligible}
            onValueChange={(v) => {
              setEligible(v as 'yes' | 'no');
              setReason(NO_REASON);
            }}
          >
            <div className="flex items-start space-x-2 rounded-md border p-3">
              <RadioGroupItem value="yes" id="noshow-eligible-yes" className="mt-0.5" />
              <Label htmlFor="noshow-eligible-yes" className="cursor-pointer text-sm font-normal">
                <span className="font-medium">Reschedule this patient</span>
                <span className="block text-xs text-muted-foreground">
                  The patient can be contacted and will receive a reschedule link.
                </span>
              </Label>
            </div>
            <div className="flex items-start space-x-2 rounded-md border border-destructive/30 p-3">
              <RadioGroupItem value="no" id="noshow-eligible-no" className="mt-0.5" />
              <Label htmlFor="noshow-eligible-no" className="cursor-pointer text-sm font-normal">
                <span className="font-medium text-destructive">Do not reschedule</span>
                <span className="block text-xs text-muted-foreground">
                  The patient must contact the clinic to reschedule.
                </span>
              </Label>
            </div>
          </RadioGroup>

          <div>
            <Label className="text-sm">Reason (Optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="No specific reason" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value={NO_REASON}>No specific reason</SelectItem>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank to send the general message with the reschedule link.
            </p>
          </div>

          {eligible === 'no' && (
            <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                Warning: This restriction remains in place until an admin removes it.
              </span>
            </div>
          )}

          <div>
            <Label className="text-sm">
              Notes {notesRequired ? <span className="text-destructive">*</span> : '(Optional)'}
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context for this decision..."
              rows={3}
              className="mt-1"
            />
            {notesRequired && notes.trim().length === 0 && (
              <p className="mt-1 text-xs text-destructive">
                Notes are required when the reason is "Other".
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Go Back
          </Button>
          <Button
            onClick={() => onConfirm(eligible === 'yes', notes, selectedReason)}
            disabled={!canSubmit}
            variant={eligible === 'no' ? 'destructive' : 'default'}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Confirm No Show'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoShowEligibilityDialog;
