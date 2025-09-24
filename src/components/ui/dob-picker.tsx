import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, Pencil, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  value?: Date;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DOBPicker({ value, onSelect, placeholder = "Select date of birth", className }: DOBPickerProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [inputMode, setInputMode] = React.useState(false);
  const [calendarDate, setCalendarDate] = React.useState<Date>(value || new Date(1980, 0, 1));

  // Update input value when external value changes
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "MM/dd/yyyy"));
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Try to parse the date as user types
    if (newValue) {
      const parsedDate = parse(newValue, "MM/dd/yyyy", new Date());
      if (isValid(parsedDate)) {
        onSelect(parsedDate);
        setCalendarDate(parsedDate);
      }
    } else {
      onSelect(undefined);
    }
  };

  const handleInputBlur = () => {
    // Validate and reformat on blur
    if (inputValue) {
      const parsedDate = parse(inputValue, "MM/dd/yyyy", new Date());
      if (isValid(parsedDate)) {
        setInputValue(format(parsedDate, "MM/dd/yyyy"));
        onSelect(parsedDate);
        setCalendarDate(parsedDate);
      } else {
        // Invalid date - reset to previous value or empty
        if (value) {
          setInputValue(format(value, "MM/dd/yyyy"));
        } else {
          setInputValue("");
        }
      }
    }
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(calendarDate);
    newDate.setFullYear(parseInt(year));
    setCalendarDate(newDate);
  };

  const handleMonthChange = (month: string) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(parseInt(month));
    setCalendarDate(newDate);
  };

  // Generate year options (1900 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-4 w-4 ml-1 p-0", className)}
          aria-label="Edit date of birth"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={inputMode ? "ghost" : "secondary"}
              size="sm"
              onClick={() => setInputMode(false)}
              className="flex items-center gap-1"
            >
              <CalendarIcon className="h-3 w-3" />
              Calendar
            </Button>
            <Button
              variant={inputMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setInputMode(true)}
              className="flex items-center gap-1"
            >
              <Type className="h-3 w-3" />
              Type
            </Button>
          </div>

          {inputMode ? (
            /* Text Input Mode */
            <div className="space-y-2">
              <Label htmlFor="dob-input" className="text-sm">
                Date of Birth
              </Label>
              <Input
                id="dob-input"
                type="text"
                placeholder="MM/DD/YYYY"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Format: MM/DD/YYYY (e.g., 06/25/1971)
              </p>
            </div>
          ) : (
            /* Enhanced Calendar Mode */
            <div className="space-y-3">
              {/* Year and Month Selectors */}
              <div className="flex gap-2">
                <Select
                  value={calendarDate.getMonth().toString()}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={calendarDate.getFullYear().toString()}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Calendar */}
              <Calendar
                mode="single"
                selected={value}
                onSelect={onSelect}
                month={calendarDate}
                onMonthChange={setCalendarDate}
                initialFocus
                className="pointer-events-auto"
                disabled={(date) => date > new Date()}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}