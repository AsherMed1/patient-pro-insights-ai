import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type BlockConflict, formatRequestedTime } from './blockConflictScan';

interface BlockConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: BlockConflict[];
  autoCancel: boolean;
  onAutoCancelChange: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function BlockConflictDialog({
  open,
  onOpenChange,
  conflicts,
  autoCancel,
  onAutoCancelChange,
  onConfirm,
  onCancel,
  isSubmitting,
}: BlockConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {conflicts.length} unconfirmed appointment{conflicts.length === 1 ? '' : 's'} overlap this block
          </DialogTitle>
          <DialogDescription>
            These patients have unconfirmed appointments during the time you're blocking.
            Choose how to handle them before creating the block.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ScrollArea className="max-h-[280px] rounded-lg border">
            <div className="divide-y">
              {conflicts.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.lead_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.calendar_name || 'Unknown calendar'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs">{formatRequestedTime(c.requested_time)}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.status?.trim() ? c.status : 'No status'}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:block">
                    {c.lead_phone_number || '—'}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
            <Checkbox
              id="auto-cancel-conflicts"
              checked={autoCancel}
              onCheckedChange={(v) => onAutoCancelChange(v === true)}
              disabled={isSubmitting}
              className="mt-0.5"
            />
            <Label htmlFor="auto-cancel-conflicts" className="text-sm leading-snug cursor-pointer">
              <span className="font-medium">Auto-cancel all and notify patients</span>
              <span className="block text-xs text-muted-foreground mt-1">
                Each appointment will be cancelled with reason "Auto-cancelled: Clinic blocked time".
                The clinic's existing GHL workflow will send patient SMS notifications.
              </span>
            </Label>
          </div>

          {!autoCancel && (
            <p className="text-xs text-muted-foreground italic px-1">
              Block will be created but these appointments will remain Pending. Setters will need to call patients manually.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {autoCancel ? 'Cancelling & blocking...' : 'Creating block...'}
              </>
            ) : autoCancel ? (
              `Cancel ${conflicts.length} & Create Block`
            ) : (
              'Skip & Create Block'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
