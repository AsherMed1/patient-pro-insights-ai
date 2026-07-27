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
import { Loader2, AlertTriangle } from 'lucide-react';

interface NoShowEligibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName?: string | null;
  submitting?: boolean;
  onConfirm: (eligible: boolean, notes: string) => void | Promise<void>;
}

const NoShowEligibilityDialog = ({
  open,
  onOpenChange,
  patientName,
  submitting = false,
  onConfirm,
}: NoShowEligibilityDialogProps) => {
  const [eligible, setEligible] = useState<'yes' | 'no'>('yes');
  const [notes, setNotes] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEligible('yes');
      setNotes('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as No Show</DialogTitle>
          <DialogDescription>
            Can this patient be rescheduled?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup value={eligible} onValueChange={(v) => setEligible(v as 'yes' | 'no')}>
            <div className="flex items-start space-x-2 rounded-md border p-3">
              <RadioGroupItem value="yes" id="noshow-eligible-yes" className="mt-0.5" />
              <Label htmlFor="noshow-eligible-yes" className="cursor-pointer text-sm font-normal">
                <span className="font-medium">Eligible for rescheduling</span>
                <span className="block text-xs text-muted-foreground">
                  The patient can be contacted and rescheduled.
                </span>
              </Label>
            </div>
            <div className="flex items-start space-x-2 rounded-md border border-destructive/30 p-3">
              <RadioGroupItem value="no" id="noshow-eligible-no" className="mt-0.5" />
              <Label htmlFor="noshow-eligible-no" className="cursor-pointer text-sm font-normal">
                <span className="font-medium text-destructive">
                  Not eligible for rescheduling
                </span>
                <span className="block text-xs text-muted-foreground">
                  The patient must contact the clinic to reschedule.
                </span>
              </Label>
            </div>
          </RadioGroup>

          {eligible === 'no' && (
            <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                Warning: This restriction remains in place until an admin removes it.
              </span>
            </div>
          )}

          <div>
            <Label className="text-sm">Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context for this decision..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Go Back
          </Button>
          <Button
            onClick={() => onConfirm(eligible === 'yes', notes)}
            disabled={submitting}
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
