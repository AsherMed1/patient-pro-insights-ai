
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from 'lucide-react';
import { subDays } from 'date-fns';

interface FullDataDateFilterProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

const FullDataDateFilter = ({ dateRange, onDateRangeChange }: FullDataDateFilterProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Date Range Filter</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
              }
            }}
          />
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateRangeChange({
                from: subDays(new Date(), 7),
                to: new Date()
              })}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateRangeChange({
                from: subDays(new Date(), 30),
                to: new Date()
              })}
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateRangeChange({
                from: subDays(new Date(), 90),
                to: new Date()
              })}
            >
              Last 90 Days
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FullDataDateFilter;
