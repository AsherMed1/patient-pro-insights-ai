import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGhlCalendars } from '@/hooks/useGhlCalendars';
import { TimeInput } from './TimeInput';
import { scanBlockConflicts, type BlockConflict } from './blockConflictScan';
import { BlockConflictDialog } from './BlockConflictDialog';

const AUTO_CANCEL_REASON = 'Auto-cancelled: Clinic blocked time';

interface ReserveTimeBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  initialDate?: Date;
  initialHour?: number;
  onSuccess?: () => void;
  userName?: string;
  userId?: string;
}

interface TimeRange {
  id: string;
  startTime: string;
  endTime: string;
}

interface TimeRangeRowProps {
  range: TimeRange;
  isLast: boolean;
  canDelete: boolean;
  onUpdate: (id: string, field: 'startTime' | 'endTime', value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

function TimeRangeRow({ range, isLast, canDelete, onUpdate, onAdd, onRemove }: TimeRangeRowProps) {
  return (
    <div className="flex items-center gap-2">
      <TimeInput
        value={range.startTime}
        onChange={(v) => onUpdate(range.id, 'startTime', v)}
        placeholder="Start time"
      />

      <span className="text-muted-foreground text-sm">To</span>

      <TimeInput
        value={range.endTime}
        onChange={(v) => onUpdate(range.id, 'endTime', v)}
        placeholder="End time"
      />

      {isLast && (
        <Button variant="ghost" size="icon" onClick={onAdd} className="h-9 w-9">
          <Plus className="h-4 w-4" />
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(range.id)}
        disabled={!canDelete}
        className="h-9 w-9 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface CalendarCheckboxListProps {
  calendars: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  loading: boolean;
}

function CalendarCheckboxList({ calendars, selectedIds, onSelectionChange, loading }: CalendarCheckboxListProps) {
  const [search, setSearch] = useState('');

  const visibleCalendars = calendars
    .filter(c => !c.name.toLowerCase().includes('call back request'))
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const toggleCalendar = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(cid => cid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => onSelectionChange([
    ...selectedIds,
    ...visibleCalendars.map(c => c.id).filter(id => !selectedIds.includes(id))
  ]);
  const deselectAll = () => onSelectionChange(
    selectedIds.filter(id => !visibleCalendars.some(c => c.id === id))
  );

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Calendar(s)</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading calendars...
        </div>
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Calendar(s)</Label>
        <p className="text-sm text-muted-foreground">
          No calendars available. Please configure GHL integration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Calendar(s)</Label>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 px-2 text-xs">
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll} className="h-7 px-2 text-xs">
            Deselect All
          </Button>
        </div>
      </div>
      <Input
        placeholder="Search calendars..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="rounded-lg border p-3 bg-muted/30 max-h-48 overflow-y-auto space-y-2">
        {visibleCalendars.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">No matching calendars</p>
        ) : (
          visibleCalendars.map((calendar) => (
            <div key={calendar.id} className="flex items-center gap-2">
              <Checkbox
                id={`cal-${calendar.id}`}
                checked={selectedIds.includes(calendar.id)}
                onCheckedChange={() => toggleCalendar(calendar.id)}
              />
              <label 
                htmlFor={`cal-${calendar.id}`} 
                className="text-sm cursor-pointer truncate flex-1"
                title={calendar.name}
              >
                {calendar.name}
              </label>
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {selectedIds.length} selected · {visibleCalendars.length} calendar{visibleCalendars.length !== 1 ? 's' : ''} shown
      </p>
    </div>
  );
}

export function ReserveTimeBlockDialog({
  open,
  onOpenChange,
  projectName,
  initialDate,
  initialHour,
  onSuccess,
  userName,
  userId,
}: ReserveTimeBlockDialogProps) {
  const { toast } = useToast();
  const { calendars, loading: calendarsLoading, fetchCalendars } = useGhlCalendars();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate || new Date());
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([
    {
      id: '1',
      startTime: initialHour !== undefined ? `${initialHour.toString().padStart(2, '0')}:00` : '09:00',
      endTime: '17:00',
    },
  ]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ghlLocationId, setGhlLocationId] = useState<string | null>(null);
  const [projectTimezone, setProjectTimezone] = useState<string | null>(null);

  // Conflict-scan state
  const [hardConflicts, setHardConflicts] = useState<BlockConflict[]>([]);
  const [softConflicts, setSoftConflicts] = useState<BlockConflict[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [autoCancelConflicts, setAutoCancelConflicts] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Time range management functions
  const addTimeRange = () => {
    setTimeRanges([
      ...timeRanges,
      {
        id: Date.now().toString(),
        startTime: '09:00',
        endTime: '17:00',
      },
    ]);
  };

  const removeTimeRange = (id: string) => {
    if (timeRanges.length > 1) {
      setTimeRanges(timeRanges.filter((range) => range.id !== id));
    }
  };

  const updateTimeRange = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setTimeRanges(
      timeRanges.map((range) => (range.id === id ? { ...range, [field]: value } : range))
    );
  };

  // Fetch project GHL settings and calendars
  useEffect(() => {
    const fetchProjectSettings = async () => {
      if (!projectName || !open) return;

       const { data: project, error } = await supabase
        .from('projects')
         .select('ghl_location_id, ghl_api_key, timezone')
        .eq('project_name', projectName)
        .single();

      if (error || !project) {
        console.error('Failed to fetch project settings:', error);
        return;
      }

      setGhlLocationId(project.ghl_location_id);
       setProjectTimezone(project.timezone || null);

      if (project.ghl_location_id) {
        await fetchCalendars(project.ghl_location_id, project.ghl_api_key);
      }
    };

    fetchProjectSettings();
  }, [projectName, open, fetchCalendars]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate(initialDate || new Date());
      setTimeRanges([
        {
          id: '1',
          startTime: initialHour !== undefined ? `${initialHour.toString().padStart(2, '0')}:00` : '09:00',
          endTime: '17:00',
        },
      ]);
      setSelectedCalendarIds([]);
      setReason('');
      setHardConflicts([]);
      setSoftConflicts([]);
      setShowConflictDialog(false);
      setAutoCancelConflicts(true);
    }
  }, [open, initialDate, initialHour]);

  const validateTimeRanges = (): boolean => {
    const tz = projectTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const timeFormatRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    for (const range of timeRanges) {
      // Validate time format (HH:mm)
      if (!timeFormatRegex.test(range.startTime) || !timeFormatRegex.test(range.endTime)) {
        toast({
          title: 'Invalid Time Format',
          description: 'Please enter a valid time (e.g., 9:15 AM or 14:30)',
          variant: 'destructive',
        });
        return false;
      }

      if (range.startTime >= range.endTime) {
        toast({
          title: 'Invalid Time Range',
          description: 'End time must be after start time',
          variant: 'destructive',
        });
        return false;
      }

      // Check that block doesn't exceed 10 hours (GHL limitation)
      const [startH, startM] = range.startTime.split(':').map(Number);
      const [endH, endM] = range.endTime.split(':').map(Number);
      const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

      if (durationMinutes > 600) {
        toast({
          title: 'Time Block Too Long',
          description: 'Reserved blocks cannot exceed 10 hours. Please create multiple shorter blocks instead.',
          variant: 'destructive',
        });
        return false;
      }

      // Prevent booking a start time that is already in the past (in project TZ)
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const startUtc = fromZonedTime(`${dateStr}T${range.startTime}:00`, tz);
        if (startUtc < new Date()) {
          toast({
            title: 'Start Time in the Past',
            description: 'Please choose a start time that has not already passed.',
            variant: 'destructive',
          });
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedDate || selectedCalendarIds.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date and at least one calendar.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateTimeRanges()) {
      return;
    }

    // Run conflict scan against unconfirmed appointments
    setIsScanning(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const calendarNames = selectedCalendarIds
        .map((id) => calendars.find((c) => c.id === id)?.name)
        .filter((n): n is string => !!n);

      const { hardConflicts: hard, softConflicts: soft } = await scanBlockConflicts({
        projectName,
        dateStr,
        timeRanges: timeRanges.map((r) => ({ startTime: r.startTime, endTime: r.endTime })),
        calendarNames,
      });

      if (hard.length > 0 || soft.length > 0) {
        setHardConflicts(hard);
        setSoftConflicts(soft);
        setAutoCancelConflicts(true);
        setShowConflictDialog(true);
        setIsScanning(false);
        return;
      }
    } catch (err) {
      console.error('[ReserveTimeBlock] Conflict scan failed:', err);
      // Non-blocking — proceed even if scan fails
    } finally {
      setIsScanning(false);
    }

    // No conflicts → proceed straight to creation
    await executeBlockCreation([]);
  };

  const cancelConflictingAppointments = async (
    toCancel: BlockConflict[],
    successfulCalendarNames: string[]
  ) => {
    // Belt-and-suspenders: refuse to auto-cancel anything that is not in the soft tier.
    // The dialog should never pass hard conflicts here, but if a stale UI ever does,
    // we drop them on the floor instead of silently cancelling a real patient.
    // (Incident: VIM 2026-04-21 — confirmed/welcome-call rows were silently cancelled.)
    const SOFT_TIER = new Set(['', 'pending']);
    const softOnly = toCancel.filter((c) => {
      const s = (c.status || '').toString().trim().toLowerCase();
      const isSoft = SOFT_TIER.has(s);
      const wasConfirmed = c.was_ever_confirmed === true;
      if (!isSoft || wasConfirmed) {
        console.warn(
          '[ReserveTimeBlock] Refusing to auto-cancel non-soft conflict:',
          { id: c.id, lead: c.lead_name, status: c.status, was_ever_confirmed: wasConfirmed }
        );
        return false;
      }
      return true;
    });

    // Only cancel conflicts on calendars where the block actually succeeded
    const eligible = softOnly.filter((c) =>
      c.calendar_name && successfulCalendarNames.includes(c.calendar_name)
    );

    let cancelledCount = 0;

    for (const appt of eligible) {
      try {
        // 1. Update local DB
        const { error: updateError } = await supabase
          .from('all_appointments')
          .update({
            status: 'Cancelled',
            cancellation_reason: AUTO_CANCEL_REASON,
            updated_at: new Date().toISOString(),
          })
          .eq('id', appt.id);

        if (updateError) {
          console.error(`[ReserveTimeBlock] Failed to cancel appt ${appt.id}:`, updateError);
          continue;
        }

        // 2. Internal note (attribution)
        const noteText = `Auto-cancelled by ${userName || 'Portal User'} due to clinic time block${reason ? ` (${reason})` : ''} on ${format(selectedDate!, 'PPP')}.`;
        await supabase.from('appointment_notes').insert({
          appointment_id: appt.id,
          note_text: noteText,
          created_by: userId || null,
        });

        // 3. Sync cancellation to GHL (best-effort)
        if (appt.ghl_appointment_id) {
          supabase.functions.invoke('update-ghl-appointment', {
            body: {
              ghl_appointment_id: appt.ghl_appointment_id,
              project_name: projectName,
              status: 'Cancelled',
            },
          }).catch((err) => {
            console.error(`[ReserveTimeBlock] GHL sync failed for ${appt.id}:`, err);
          });
        }

        // 4. Fire status webhook → triggers patient SMS via clinic's GHL workflow
        supabase.functions.invoke('appointment-status-webhook', {
          body: {
            appointment_id: appt.id,
            old_status: appt.status || null,
            new_status: 'Cancelled',
          },
        }).catch((err) => {
          console.error(`[ReserveTimeBlock] Webhook failed for ${appt.id}:`, err);
        });

        cancelledCount++;
      } catch (err) {
        console.error(`[ReserveTimeBlock] Error cancelling appt ${appt.id}:`, err);
      }
    }

    return cancelledCount;
  };

  const executeBlockCreation = async (conflictsToHandle: BlockConflict[]) => {
    setIsSubmitting(true);

    try {
      const allCreatedAppointments: Array<{ calendarId: string; calendarName: string; range: TimeRange; ghlResult: any }> = [];
      const failedCalendars: string[] = [];
      const title = reason ? `Reserved - ${reason}` : 'Reserved';

      // Process each selected calendar
      for (const calendarId of selectedCalendarIds) {
        const selectedCalendar = calendars.find((c) => c.id === calendarId);
        const calendarName = selectedCalendar?.name || 'Unknown Calendar';

        // Create appointment for each time range on this calendar
        for (const range of timeRanges) {
          try {
            // IMPORTANT: build times in the *project's* timezone (not the user's browser timezone)
            // so the slot matches what GHL considers available.
            const tz =
              projectTimezone ||
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              'UTC';

            const dateStr = format(selectedDate, 'yyyy-MM-dd');

            const startUtc = fromZonedTime(`${dateStr}T${range.startTime}:00`, tz);
            const endUtc = fromZonedTime(`${dateStr}T${range.endTime}:00`, tz);

            // GHL docs show start/end with an explicit offset (e.g. +05:30). Provide that.
            const startTimeForGhl = formatInTimeZone(startUtc, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
            const endTimeForGhl = formatInTimeZone(endUtc, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");

            console.log('[ReserveTimeBlock] Creating reservation:', {
              project_name: projectName,
              calendar_id: calendarId,
              calendar_name: calendarName,
              timezone: tz,
              start_time: startTimeForGhl,
              end_time: endTimeForGhl,
              title,
            });

            // Create appointment in GHL + local record in one atomic operation
            // Edge function handles: GHL block creation, local DB insert, audit note
            // If local insert fails, edge function rolls back the GHL block
            // Telemetry: tell the edge function which patient appointment IDs the
            // client-side scan flagged as overlapping THIS calendar+time range.
            // Edge function will write a `block_overlap_warning` audit row if the
            // GHL block POST succeeds.
            const overlappingForThisSlot = conflictsToHandle
              .filter((c) => c.calendar_name === calendarName)
              .map((c) => c.id);

            const { data: ghlResult, error: ghlError } = await supabase.functions.invoke(
              'create-ghl-appointment',
              {
                body: {
                  project_name: projectName,
                  calendar_id: calendarId,
                  start_time: startTimeForGhl,
                  end_time: endTimeForGhl,
                  title,
                  reason,
                  // Pass additional params for local record creation
                  calendar_name: calendarName,
                  user_name: userName || 'Portal User',
                  user_id: userId,
                  create_local_record: true,
                  overlapping_appointment_ids: overlappingForThisSlot,
                },
              }
            );

            if (ghlError || !ghlResult?.success) {
              const errorMsg = ghlResult?.error || ghlError?.message || 'Failed to create reservation';
              console.error('[ReserveTimeBlock] Edge function failed:', errorMsg);
              throw new Error(errorMsg);
            }

            console.log('[ReserveTimeBlock] Successfully created reservation:', {
              localAppointmentId: ghlResult.local_appointment_id,
              ghlAppointmentId: ghlResult.ghl_appointment_id,
              calendarName,
              range: `${range.startTime} - ${range.endTime}`,
              ghlSynced: ghlResult.ghl_synced,
              localSaved: ghlResult.local_saved,
            });

            // Track success - edge function handled everything
            allCreatedAppointments.push({ 
              calendarId, 
              calendarName, 
              range, 
              ghlResult,
            });
          } catch (error) {
            console.error(`[ReserveTimeBlock] Failed to create block on ${calendarName}:`, error);
            if (!failedCalendars.includes(calendarName)) {
              failedCalendars.push(calendarName);
            }
          }
        }
      }

      // Show appropriate toast based on results
      if (allCreatedAppointments.length > 0) {
        const calendarCount = selectedCalendarIds.length;
        const blockCount = allCreatedAppointments.length;
        
        if (failedCalendars.length > 0) {
          toast({
            title: 'Partial Success',
            description: `Created ${blockCount} block(s). Failed on: ${failedCalendars.join(', ')}`,
            variant: 'default',
          });
        } else {
          toast({
            title: 'Time Blocks Reserved',
            description: calendarCount > 1
              ? `Created ${blockCount} block(s) across ${calendarCount} calendars`
              : `Created ${blockCount} reservation(s) for ${format(selectedDate, 'PPP')}`,
          });
        }

        // Calculate if this is a full day block (8+ hours)
        const totalMinutesBlocked = timeRanges.reduce((sum, range) => {
          const [startH, startM] = range.startTime.split(':').map(Number);
          const [endH, endM] = range.endTime.split(':').map(Number);
          return sum + ((endH * 60 + endM) - (startH * 60 + startM));
        }, 0);

        const isFullDay = totalMinutesBlocked >= 480;

        // Helper to format time for display
        const formatTimeDisplay = (time: string) => {
          const [h, m] = time.split(':').map(Number);
          const ampm = h < 12 ? 'AM' : 'PM';
          const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
          return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
        };

        // Get unique calendar names from successful creations
        const successfulCalendarNames = [...new Set(allCreatedAppointments.map(a => a.calendarName))];

        // Auto-cancel conflicting unconfirmed appointments (only for calendars where block succeeded)
        let cancelledCount = 0;
        if (conflictsToHandle.length > 0 && autoCancelConflicts) {
          cancelledCount = await cancelConflictingAppointments(conflictsToHandle, successfulCalendarNames);
          if (cancelledCount > 0) {
            toast({
              title: 'Appointments Auto-Cancelled',
              description: `${cancelledCount} unconfirmed appointment(s) cancelled. Patients notified via GHL workflow.`,
            });
          }
        }

        // Send Slack notification (fire-and-forget, don't block on failure)
        supabase.functions.invoke('notify-calendar-update', {
          body: {
            projectName,
            calendarName: successfulCalendarNames.length > 1 
              ? `${successfulCalendarNames.length} calendars` 
              : successfulCalendarNames[0] || 'Unknown Calendar',
            calendarNames: successfulCalendarNames,
            date: format(selectedDate, 'PPPP'),
            timeRanges: timeRanges.map((range) => 
              `${formatTimeDisplay(range.startTime)} - ${formatTimeDisplay(range.endTime)}`
            ),
            reason: reason || 'Not specified',
            blockedBy: userName || 'Portal User',
            isFullDay,
          }
        }).catch(err => {
          console.error('[ReserveTimeBlock] Failed to send Slack notification:', err);
        });

        setShowConflictDialog(false);
        onOpenChange(false);
        // Small delay to ensure database transaction is committed and visible before refetch
        setTimeout(() => {
          onSuccess?.();
        }, 500);
      } else {
        throw new Error(`Failed to create blocks on all calendars: ${failedCalendars.join(', ')}`);
      }

    } catch (error) {
      console.error('[ReserveTimeBlock] Error:', error);
      
      // Provide more helpful error messages for common GHL issues
      let errorMessage = error instanceof Error ? error.message : 'An error occurred';
      if (errorMessage.includes('no longer available') || errorMessage.includes('slot')) {
        errorMessage = 'This time slot conflicts with existing appointments or calendar availability. Try a different time or shorter duration.';
      }
      
      toast({
        title: 'Failed to Reserve Time',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Reserve Time Block</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Ranges Section */}
          <div className="space-y-3">
            <Label>When are you blocking time?</Label>
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              {timeRanges.map((range, index) => (
                <TimeRangeRow
                  key={range.id}
                  range={range}
                  isLast={index === timeRanges.length - 1}
                  canDelete={timeRanges.length > 1}
                  onUpdate={updateTimeRange}
                  onAdd={addTimeRange}
                  onRemove={removeTimeRange}
                />
              ))}
            </div>
          </div>

          {/* Calendar Multi-Select */}
          <CalendarCheckboxList
            calendars={calendars}
            selectedIds={selectedCalendarIds}
            onSelectionChange={setSelectedCalendarIds}
            loading={calendarsLoading}
          />

          {/* Reason Input */}
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="e.g., Staff meeting, Lunch break"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting || isScanning}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isScanning || selectedCalendarIds.length === 0}>
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking conflicts...
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reserving {selectedCalendarIds.length > 1 ? `${selectedCalendarIds.length} blocks` : ''}...
              </>
            ) : (
              selectedCalendarIds.length > 1 
                ? `Reserve on ${selectedCalendarIds.length} Calendars` 
                : 'Reserve Time'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <BlockConflictDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        hardConflicts={hardConflicts}
        softConflicts={softConflicts}
        autoCancel={autoCancelConflicts}
        onAutoCancelChange={setAutoCancelConflicts}
        isSubmitting={isSubmitting}
        onCancel={() => {
          setShowConflictDialog(false);
          setHardConflicts([]);
          setSoftConflicts([]);
        }}
        onConfirm={() => {
          // Hard conflicts block submission entirely; only soft conflicts can be auto-cancelled here
          executeBlockCreation(autoCancelConflicts ? softConflicts : []);
        }}
      />
    </Dialog>
  );
}
