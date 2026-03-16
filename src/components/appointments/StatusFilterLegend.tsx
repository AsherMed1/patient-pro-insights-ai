import React from 'react';
import { cn } from '@/lib/utils';

export interface StatusFilterOption {
  value: string;
  label: string;
  dotColor: string;
  defaultOn: boolean;
}

export const CALENDAR_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'confirmed', label: 'Confirmed', dotColor: 'bg-blue-500', defaultOn: true },
  { value: 'welcome call', label: 'Welcome Call', dotColor: 'bg-gray-500', defaultOn: true },
  { value: 'showed', label: 'Showed', dotColor: 'bg-green-500', defaultOn: true },
  { value: 'scheduled', label: 'Scheduled', dotColor: 'bg-slate-400', defaultOn: true },
  { value: 'cancelled', label: 'Cancelled', dotColor: 'bg-red-500', defaultOn: false },
  { value: 'no show', label: 'No Show', dotColor: 'bg-yellow-500', defaultOn: false },
  { value: 'oon', label: 'OON', dotColor: 'bg-orange-500', defaultOn: false },
  { value: 'rescheduled', label: 'Rescheduled', dotColor: 'bg-purple-500', defaultOn: false },
  { value: 'do not call', label: 'Do Not Call', dotColor: 'bg-rose-700', defaultOn: false },
];

export const DEFAULT_CALENDAR_STATUSES = CALENDAR_STATUS_OPTIONS
  .filter(s => s.defaultOn)
  .map(s => s.value);

interface StatusFilterLegendProps {
  selectedStatuses: string[];
  onToggleStatus: (status: string) => void;
}

export function StatusFilterLegend({ selectedStatuses, onToggleStatus }: StatusFilterLegendProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-sm text-muted-foreground font-medium">Statuses:</span>
      {CALENDAR_STATUS_OPTIONS.map(option => {
        const isSelected = selectedStatuses.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggleStatus(option.value)}
            className={cn(
              "flex items-center gap-1.5 transition-opacity duration-150 cursor-pointer hover:opacity-80",
              !isSelected && "opacity-40"
            )}
          >
            <span className={cn("w-2.5 h-2.5 rounded-full", option.dotColor)} />
            <span className={cn(
              "text-sm font-medium text-foreground",
              !isSelected && "line-through"
            )}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
