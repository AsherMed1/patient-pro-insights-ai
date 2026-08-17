import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, FileText } from 'lucide-react';

interface ReferralRequestedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName?: string | null;
  appointmentDate?: string | null;
  submitting?: boolean;
  onConfirm: (notes: string) => void | Promise<void>;
}

const ReferralRequestedDialog = ({
  open,
  onOpenChange,
  patientName,
  appointmentDate,
  submitting = false,
  onConfirm,
}: ReferralRequestedDialogProps) => {
  const [notes, setNotes] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) setNotes('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            Mark as Referral Requested
          </DialogTitle>
          <DialogDescription>
            {patientName || 'This patient'} stays active in the portal while waiting on a PCP
            referral.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">This will:</p>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              <li>Release the scheduled slot{appointmentDate ? ` (${appointmentDate})` : ''} in GoHighLevel</li>
              <li>Keep the patient active as an unscheduled lead</li>
              <li>Track them in the Referrals tab (not OON)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referral-notes">Notes (optional)</Label>
            <Textarea
              id="referral-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Referral requested from Dr. Smith's office on 8/12"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(notes)} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Referral Requested
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralRequestedDialog;
