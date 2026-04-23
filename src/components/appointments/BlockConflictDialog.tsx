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
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { type BlockConflict, formatRequestedTime } from './blockConflictScan';

interface BlockConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hardConflicts: BlockConflict[];
  softConflicts: BlockConflict[];
  autoCancel: boolean;
  onAutoCancelChange: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function ConflictRow({ c, tone }: { c: BlockConflict; tone: 'hard' | 'soft' }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{c.lead_name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {c.calendar_name || 'Unknown calendar'}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-xs">{formatRequestedTime(c.requested_time)}</div>
        <Badge
          variant={tone === 'hard' ? 'destructive' : 'secondary'}
          className="text-[10px] mt-0.5"
        >
          {c.status?.trim() || 'No status'}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:block">
        {c.lead_phone_number || '—'}
      </div>
    </div>
  );
}

export function BlockConflictDialog({
  open,
  onOpenChange,
  hardConflicts,
  softConflicts,
  autoCancel,
  onAutoCancelChange,
  onConfirm,
  onCancel,
  isSubmitting,
}: BlockConflictDialogProps) {
  const hasHard = hardConflicts.length > 0;
  const hasSoft = softConflicts.length > 0;
  const totalCount = hardConflicts.length + softConflicts.length;

  const titleText = hasHard
    ? `${totalCount} appointment${totalCount === 1 ? '' : 's'} overlap this block`
    : `${softConflicts.length} unconfirmed appointment${softConflicts.length === 1 ? '' : 's'} overlap this block`;

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {titleText}
          </DialogTitle>
          <DialogDescription>
            {hasHard
              ? 'GoHighLevel will silently cancel confirmed appointments that overlap a calendar block. Resolve the items below before continuing.'
              : "These patients have unconfirmed appointments during the time you're blocking. Choose how to handle them."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* HARD CONFLICTS — must resolve before proceeding */}
          {hasHard && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <ShieldAlert className="h-4 w-4" />
                Will be cancelled in GoHighLevel — fix before continuing
              </div>
              <ScrollArea className="max-h-[200px] rounded-lg border border-destructive/40 bg-destructive/5">
                <div className="divide-y divide-destructive/20">
                  {hardConflicts.map((c) => (
                    <ConflictRow key={c.id} c={c} tone="hard" />
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground italic px-1">
                These confirmed appointments would be silently cancelled by GHL if you create this block.
                Reschedule them first, shrink your block window so it no longer overlaps, or remove the
                affected calendar(s) from your selection.
              </p>
            </div>
          )}

          {/* SOFT CONFLICTS — existing auto-cancel flow */}
          {hasSoft && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-warning-foreground">
                Unconfirmed appointments overlap this block
              </div>
              <ScrollArea className="max-h-[200px] rounded-lg border">
                <div className="divide-y">
                  {softConflicts.map((c) => (
                    <ConflictRow key={c.id} c={c} tone="soft" />
                  ))}
                </div>
              </ScrollArea>

              {!hasHard && (
                <>
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
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {hasHard ? (
            <Button onClick={onCancel} disabled={isSubmitting}>
              Adjust Block
            </Button>
          ) : (
            <>
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
                  `Cancel ${softConflicts.length} & Create Block`
                ) : (
                  'Skip & Create Block'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
