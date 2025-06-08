import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import type { Project, DateRange } from './types';

interface ProjectFiltersProps {
  projects: Project[];
  selectedProject: string;
  onProjectChange: (project: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onQuickDateRange: (type: string) => void;
}

const ProjectFilters = ({
  projects,
  selectedProject,
  onProjectChange,
  dateRange,
  onDateRangeChange,
  onQuickDateRange
}: ProjectFiltersProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Project:</label>
            <Select value={selectedProject} onValueChange={onProjectChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.project_name}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Date Range:</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[120px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "MMM dd") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => onDateRangeChange({ ...dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[120px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "MMM dd") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => onDateRangeChange({ ...dateRange, to: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onQuickDateRange('wtd')}>
              WTD
            </Button>
            <Button variant="outline" size="sm" onClick={() => onQuickDateRange('mtd')}>
              MTD
            </Button>
            <Button variant="outline" size="sm" onClick={() => onQuickDateRange('ytd')}>
              YTD
            </Button>
            <Button variant="outline" size="sm" onClick={() => onQuickDateRange('last7')}>
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => onQuickDateRange('')}>
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectFilters;
