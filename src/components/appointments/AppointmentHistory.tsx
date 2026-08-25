import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAppointmentHistory } from '@/hooks/useAppointmentHistory';
import { formatInCentralTime } from '@/utils/dateTimeUtils';
import { AllAppointment } from './types';

interface AppointmentHistoryProps {
  appointment: AllAppointment;
  defaultOpen?: boolean;
  title?: string;
}

const getStatusBadgeVariant = (status: string | null): "showed" | "cancelled" | "confirmed" | "rescheduled" | "noshow" | "secondary" => {
  const s = (status ?? '').toLowerCase().trim();
  if (s === 'showed') return 'showed';
  if (s === 'confirmed') return 'confirmed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'no show' || s === 'noshow') return 'noshow';
  if (s === 'rescheduled') return 'rescheduled';
  return 'secondary';
};

const AppointmentHistory: React.FC<AppointmentHistoryProps> = ({
  appointment,
  defaultOpen = true,
  title = 'Patient History',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  const { data: history = [], isLoading } = useAppointmentHistory({
    ghlId: appointment.ghl_id,
    phone: appointment.lead_phone_number,
    leadName: appointment.lead_name,
    projectName: appointment.project_name,
    currentAppointmentId: appointment.id,
  });

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-2">Loading patient history...</div>
    );
  }

  if (history.length <= 1) {
    return null; // No history to show beyond the current appointment
  }

  const visibleHistory = showAll ? history : history.slice(0, 10);
  const hasMore = history.length > 10 && !showAll;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full flex items-center justify-between px-2 py-1.5 h-auto">
          <span className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4" />
            {title} ({history.length})
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 mt-1">
          {visibleHistory.map((entry) => {
            const isCurrent = entry.id === appointment.id;
            const isSuperseded = entry.is_superseded === true;
            const dateStr = entry.date_of_appointment
              ? formatInCentralTime(entry.date_of_appointment, 'MMM d, yyyy')
              : 'No date';
            const timeStr = entry.requested_time
              ? formatInCentralTime(entry.requested_time, 'h:mm a')
              : entry.date_of_appointment
                ? formatInCentralTime(entry.date_of_appointment, 'h:mm a')
                : '';
            const createdStr = entry.date_appointment_created
              ? formatInCentralTime(entry.date_appointment_created, 'MMM d, yyyy')
              : '—';
            const service = entry.calendar_name || 'N/A';
            const status = entry.status || 'Scheduled';

            return (
              <div
                key={entry.id}
                className={`flex flex-wrap items-center gap-2 text-xs px-2 py-1.5 rounded ${
                  isCurrent
                    ? 'bg-primary/10 border border-primary/20 font-medium'
                    : isSuperseded
                      ? 'bg-muted/30 text-muted-foreground opacity-80'
                      : 'bg-muted/50'
                }`}
              >
                <span className="whitespace-nowrap">
                  {dateStr} {timeStr}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="truncate">{service}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground whitespace-nowrap">Created {createdStr}</span>
                <Badge variant={getStatusBadgeVariant(status)} className="text-[10px] px-1.5 py-0">
                  {status}
                </Badge>
                {isSuperseded && !isCurrent && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                    Superseded
                  </Badge>
                )}
                {isCurrent && (
                  <span className="text-[10px] text-primary font-semibold ml-auto whitespace-nowrap">← Current</span>
                )}
              </div>
            );
          })}

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setShowAll(true)}
            >
              View more ({history.length - 10} remaining)
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AppointmentHistory;
