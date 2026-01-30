import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TimeInputProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  placeholder?: string;
}

// 10-minute intervals for dropdown quick selection
const TIME_SLOTS = Array.from({ length: 144 }, (_, i) => {
  const hour = Math.floor(i / 6);
  const minute = (i % 6) * 10;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    label: `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`,
  };
});

// Convert HH:mm to display format (e.g., "9:15 AM")
function formatForDisplay(time: string): string {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return '';
  
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${displayHour}:${minute} ${ampm}`;
}

// Parse user input to HH:mm format
function parseTimeInput(input: string): string | null {
  if (!input) return null;
  
  const trimmed = input.trim().toLowerCase();
  
  // Check for AM/PM indicator
  const hasAM = /\s*a\.?m?\.?\s*$/i.test(trimmed);
  const hasPM = /\s*p\.?m?\.?\s*$/i.test(trimmed);
  
  // Remove AM/PM suffix for parsing
  const timeOnly = trimmed.replace(/\s*(a\.?m?\.?|p\.?m?\.?)\s*$/i, '').trim();
  
  let hours: number;
  let minutes: number;
  
  // Try different formats
  if (/^\d{1,2}:\d{2}$/.test(timeOnly)) {
    // Format: "9:15" or "09:15"
    const [h, m] = timeOnly.split(':');
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10);
  } else if (/^\d{3,4}$/.test(timeOnly)) {
    // Format: "915" or "1430"
    if (timeOnly.length === 3) {
      hours = parseInt(timeOnly[0], 10);
      minutes = parseInt(timeOnly.slice(1), 10);
    } else {
      hours = parseInt(timeOnly.slice(0, 2), 10);
      minutes = parseInt(timeOnly.slice(2), 10);
    }
  } else if (/^\d{1,2}$/.test(timeOnly)) {
    // Format: "9" or "14" (hour only)
    hours = parseInt(timeOnly, 10);
    minutes = 0;
  } else {
    return null;
  }
  
  // Validate ranges
  if (minutes < 0 || minutes > 59) return null;
  if (hours < 0 || hours > 23) return null;
  
  // Handle AM/PM conversion
  if (hasAM && hours === 12) {
    hours = 0; // 12 AM = 00:00
  } else if (hasPM && hours !== 12) {
    hours += 12; // PM adds 12 (except 12 PM)
  } else if (!hasAM && !hasPM && hours < 12 && hours >= 1 && hours <= 6) {
    // Ambiguous times 1-6 without AM/PM - assume they meant the time as-is
    // This avoids confusion; user should specify AM/PM for clarity
  }
  
  // Final validation
  if (hours > 23) return null;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function TimeInput({ value, onChange, placeholder = 'Enter time' }: TimeInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync input value with prop value
  useEffect(() => {
    setInputValue(formatForDisplay(value));
    setHasError(false);
  }, [value]);

  // Scroll to selected time when dropdown opens
  useEffect(() => {
    if (isOpen && listRef.current && value) {
      const selectedElement = listRef.current.querySelector(`[data-value="${value}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
  }, [isOpen, value]);

  const handleBlur = () => {
    const parsed = parseTimeInput(inputValue);
    if (parsed) {
      onChange(parsed);
      setInputValue(formatForDisplay(parsed));
      setHasError(false);
    } else if (inputValue.trim() === '') {
      // Allow empty - reset to current value
      setInputValue(formatForDisplay(value));
      setHasError(false);
    } else {
      // Invalid input - show error state but keep what user typed
      setHasError(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
      inputRef.current?.blur();
    }
  };

  const handleSelect = (timeValue: string) => {
    onChange(timeValue);
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-center">
      <div className="relative flex-1">
        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setHasError(false);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'pl-8 pr-8 w-[130px]',
            hasError && 'border-destructive focus-visible:ring-destructive'
          )}
        />
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 h-full px-2 hover:bg-transparent"
            tabIndex={-1}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[130px] p-0" 
          align="start"
          sideOffset={4}
        >
          <div 
            ref={listRef}
            className="max-h-[200px] overflow-y-auto"
          >
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.value}
                data-value={slot.value}
                onClick={() => handleSelect(slot.value)}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                  value === slot.value && 'bg-accent text-accent-foreground font-medium'
                )}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

