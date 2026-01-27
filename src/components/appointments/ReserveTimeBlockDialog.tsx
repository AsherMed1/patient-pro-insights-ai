import React, { useState, useEffect } from 'react';
import { format, addMinutes, parse, setHours, setMinutes } from 'date-fns';
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
import { CalendarIcon, Clock, Loader2 } from 'lucide-react';
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

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, '0')}:00`,
    label: `${displayHour}:00 ${ampm}`,
  };
});

const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
];

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
  const [selectedTime, setSelectedTime] = useState<string>(
    initialHour !== undefined 
      ? `${initialHour.toString().padStart(2, '0')}:00`
      : '09:00'
  );
  const [duration, setDuration] = useState<string>('60');
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ghlLocationId, setGhlLocationId] = useState<string | null>(null);
  const [ghlApiKey, setGhlApiKey] = useState<string | null>(null);

  // Fetch project GHL settings and calendars
  useEffect(() => {
    const fetchProjectSettings = async () => {
      if (!projectName || !open) return;

      const { data: project, error } = await supabase
        .from('projects')
        .select('ghl_location_id, ghl_api_key')
        .eq('project_name', projectName)
        .single();

      if (error || !project) {
        console.error('Failed to fetch project settings:', error);
        return;
      }

      setGhlLocationId(project.ghl_location_id);
      setGhlApiKey(project.ghl_api_key);

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
      setSelectedTime(
        initialHour !== undefined 
          ? `${initialHour.toString().padStart(2, '0')}:00`
          : '09:00'
      );
      setDuration('60');
      setReason('');
    }
  }, [open, initialDate, initialHour]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !selectedCalendarId) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date, time, and calendar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse time and create start/end times
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDateTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endDateTime = addMinutes(startDateTime, parseInt(duration));

      const title = reason ? `Reserved - ${reason}` : 'Reserved';
      
      // Format for GHL API (ISO 8601)
      const startTime = startDateTime.toISOString();
      const endTime = endDateTime.toISOString();

      console.log('[ReserveTimeBlock] Creating reservation:', {
        project_name: projectName,
        calendar_id: selectedCalendarId,
        start_time: startTime,
        end_time: endTime,
        title,
      });

      // Create appointment in GHL
      const { data: ghlResult, error: ghlError } = await supabase.functions.invoke('create-ghl-appointment', {
        body: {
          project_name: projectName,
          calendar_id: selectedCalendarId,
          start_time: startTime,
          end_time: endTime,
          title,
          reason,
        },
      });

      if (ghlError || !ghlResult?.success) {
        throw new Error(ghlResult?.error || ghlError?.message || 'Failed to create GHL appointment');
      }

      // Find selected calendar name
      const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);

      // Create local record in all_appointments
      const { data: newAppointment, error: insertError } = await supabase
        .from('all_appointments')
        .insert({
          project_name: projectName,
          lead_name: title,
          date_of_appointment: format(selectedDate, 'yyyy-MM-dd'),
          requested_time: format(startDateTime, 'HH:mm'),
          calendar_name: selectedCalendar?.name || 'Unknown Calendar',
          status: 'Confirmed',
          is_reserved_block: true,
          ghl_appointment_id: ghlResult.ghl_appointment_id,
          ghl_location_id: ghlLocationId,
          date_appointment_created: format(new Date(), 'yyyy-MM-dd'),
          patient_intake_notes: `Time block reserved by ${userName || 'Portal User'} on ${format(new Date(), 'PPP')}\nReason: ${reason || 'Not specified'}\nDuration: ${parseInt(duration) / 60} hour(s)`,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[ReserveTimeBlock] Failed to create local record:', insertError);
        // Don't throw - GHL appointment was created successfully
      }

      // Create audit note if we have an appointment ID
      if (newAppointment?.id && userId) {
        await supabase.from('appointment_notes').insert({
          appointment_id: newAppointment.id,
          note_text: `Reserved time block created by ${userName || 'Portal User'}. Reason: ${reason || 'Not specified'}. Duration: ${parseInt(duration) / 60} hour(s).`,
          created_by: userId,
        });
      }

      toast({
        title: 'Time Block Reserved',
        description: `Reserved ${format(startDateTime, 'PPp')} - ${format(endDateTime, 'p')}`,
      });

      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error('[ReserveTimeBlock] Error:', error);
      toast({
        title: 'Failed to Reserve Time',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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

          {/* Time Select */}
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration Select */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
