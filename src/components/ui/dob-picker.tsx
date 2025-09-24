import * as React from "react";
import { format, parse, isValid, startOfYear, endOfYear } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DOBPickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DOBPicker({ 
  value, 
  onChange, 
  placeholder = "Select date of birth",
  disabled = false,
  className 
}: DOBPickerProps) {
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, "MM/dd/yyyy") : ""
  );
  const [calendarDate, setCalendarDate] = React.useState<Date>(
    value || new Date(1980, 0, 1) // Default to 1980 for DOB
  );
  const [isOpen, setIsOpen] = React.useState(false);

  // Update input when value changes externally
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "MM/dd/yyyy"));
      setCalendarDate(value);
    } else {
      setInputValue("");
    }
  }, [value]);

  // Handle direct text input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Try to parse the input as MM/dd/yyyy
    if (newValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parsedDate = parse(newValue, "MM/dd/yyyy", new Date());
      if (isValid(parsedDate) && parsedDate.getFullYear() >= 1900 && parsedDate <= new Date()) {
        onChange(parsedDate);
        setCalendarDate(parsedDate);
      }
    } else if (newValue === "") {
      onChange(null);
    }
  };

  // Handle input blur - format the date if valid
  const handleInputBlur = () => {
    if (value) {
      setInputValue(format(value, "MM/dd/yyyy"));
    }
  };

  // Handle calendar selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setInputValue(format(date, "MM/dd/yyyy"));
      setIsOpen(false);
    }
  };

  // Generate year options (from 1920 to current year)
  const currentYear = new Date().getFullYear();
  const startYear = 1920;
  const years = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => currentYear - i
  );

  // Generate month options
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Handle year/month navigation
  const handleYearChange = (year: string) => {
    const newDate = new Date(parseInt(year), calendarDate.getMonth(), 1);
    setCalendarDate(newDate);
  };

  const handleMonthChange = (month: string) => {
    const monthIndex = months.indexOf(month);
    const newDate = new Date(calendarDate.getFullYear(), monthIndex, 1);
    setCalendarDate(newDate);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="MM/DD/YYYY"
            disabled={disabled}
            className="pr-10"
          />
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full w-10 rounded-l-none"
              disabled={disabled}
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="sr-only">Open calendar</span>
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            {/* Year and Month selectors */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select
                  value={calendarDate.getFullYear().toString()}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select
                  value={months[calendarDate.getMonth()]}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Calendar */}
            <DayPicker
              mode="single"
              selected={value || undefined}
              onSelect={handleCalendarSelect}
              month={calendarDate}
              onMonthChange={setCalendarDate}
              disabled={(date) => 
                date > new Date() || date < new Date(1900, 0, 1)
              }
              className={cn("pointer-events-auto")}
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                  "h-7 w-7 bg-background border border-border rounded-md p-0 opacity-50 hover:opacity-100"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(
                  "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground"
                ),
                day_range_end: "day-range-end",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
            />
            
            <div className="text-xs text-muted-foreground text-center">
              You can also type directly: MM/DD/YYYY
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}