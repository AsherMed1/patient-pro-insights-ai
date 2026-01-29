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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGhlCalendars } from '@/hooks/useGhlCalendars';

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

// 30-minute intervals for more granular selection
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    label: `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`,
  };
});

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
      <Select value={range.startTime} onValueChange={(v) => onUpdate(range.id, 'startTime', v)}>
        <SelectTrigger className="w-[130px]">
          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {TIME_SLOTS.map((slot) => (
            <SelectItem key={slot.value} value={slot.value}>
              {slot.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground text-sm">To</span>

      <Select value={range.endTime} onValueChange={(v) => onUpdate(range.id, 'endTime', v)}>
        <SelectTrigger className="w-[130px]">
          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {TIME_SLOTS.map((slot) => (
            <SelectItem key={slot.value} value={slot.value}>
              {slot.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ghlLocationId, setGhlLocationId] = useState<string | null>(null);
  const [projectTimezone, setProjectTimezone] = useState<string | null>(null);

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

  // Set default calendar when calendars load
  useEffect(() => {
    if (calendars.length > 0 && !selectedCalendarId) {
      setSelectedCalendarId(calendars[0].id);
    }
  }, [calendars, selectedCalendarId]);

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
      setReason('');
    }
  }, [open, initialDate, initialHour]);

  const validateTimeRanges = (): boolean => {
    const tz = projectTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    for (const range of timeRanges) {
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
    if (!selectedDate || !selectedCalendarId) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date and calendar.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateTimeRanges()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const createdAppointments: Array<{ range: TimeRange; ghlResult: any }> = [];
      const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId);
      const title = reason ? `Reserved - ${reason}` : 'Reserved';

      // Create appointment for each time range
      for (const range of timeRanges) {
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
          calendar_id: selectedCalendarId,
          timezone: tz,
          start_time: startTimeForGhl,
          end_time: endTimeForGhl,
          title,
        });

        // Create appointment in GHL
        const { data: ghlResult, error: ghlError } = await supabase.functions.invoke(
          'create-ghl-appointment',
          {
            body: {
              project_name: projectName,
              calendar_id: selectedCalendarId,
              start_time: startTimeForGhl,
              end_time: endTimeForGhl,
              title,
              reason,
            },
          }
        );

        if (ghlError || !ghlResult?.success) {
          throw new Error(ghlResult?.error || ghlError?.message || 'Failed to create GHL appointment');
        }

        // Create local record in all_appointments
        const { data: newAppointment, error: insertError } = await supabase
          .from('all_appointments')
          .insert({
            project_name: projectName,
            lead_name: title,
            date_of_appointment: formatInTimeZone(startUtc, tz, 'yyyy-MM-dd'),
            requested_time: formatInTimeZone(startUtc, tz, 'HH:mm'),
            calendar_name: selectedCalendar?.name || 'Unknown Calendar',
            status: 'Confirmed',
            is_reserved_block: true,
            internal_process_complete: true, // Mark complete so it doesn't appear in "New" tab
            ghl_appointment_id: ghlResult.ghl_appointment_id,
            ghl_location_id: ghlLocationId,
            date_appointment_created: format(new Date(), 'yyyy-MM-dd'),
            patient_intake_notes: `Time block reserved by ${userName || 'Portal User'} on ${format(new Date(), 'PPP')}\nReason: ${reason || 'Not specified'}\nTime: ${range.startTime} - ${range.endTime}`,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[ReserveTimeBlock] Failed to create local record:', insertError);
        }

        // Create audit note if we have an appointment ID
        if (newAppointment?.id && userId) {
          await supabase.from('appointment_notes').insert({
            appointment_id: newAppointment.id,
            note_text: `Reserved time block created by ${userName || 'Portal User'}. Reason: ${reason || 'Not specified'}. Time: ${range.startTime} - ${range.endTime}.`,
            created_by: userId,
          });
        }

        createdAppointments.push({ range, ghlResult });
      }

      toast({
        title: 'Time Blocks Reserved',
        description: `Created ${createdAppointments.length} reservation(s) for ${format(selectedDate, 'PPP')}`,
      });

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

      // Send Slack notification (fire-and-forget, don't block on failure)
      supabase.functions.invoke('notify-calendar-update', {
        body: {
          projectName,
          calendarName: selectedCalendar?.name || 'Unknown Calendar',
          date: format(selectedDate, 'PPPP'),
          timeRanges: createdAppointments.map(({ range }) => 
            `${formatTimeDisplay(range.startTime)} - ${formatTimeDisplay(range.endTime)}`
          ),
          reason: reason || 'Not specified',
          blockedBy: userName || 'Portal User',
          isFullDay,
        }
      }).catch(err => {
        console.error('[ReserveTimeBlock] Failed to send Slack notification:', err);
      });

      onOpenChange(false);
      onSuccess?.();
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

          {/* Calendar Select */}
          <div className="space-y-2">
            <Label>Calendar</Label>
            {calendarsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading calendars...
              </div>
            ) : calendars.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No calendars available. Please configure GHL integration.
              </p>
            ) : (
              <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedCalendarId}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reserving...
              </>
            ) : (
              'Reserve Time'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
