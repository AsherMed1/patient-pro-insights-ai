import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, Calendar as CalendarIcon, Search, Clock, CalendarRange, ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getBaseStatusOptions } from './utils';
import { useRole } from '@/hooks/useRole';
import { InsuranceSyncTrigger } from '@/components/InsuranceSyncTrigger';
interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}
interface AppointmentFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchType: 'name' | 'phone' | 'dob';
  onSearchTypeChange: (value: 'name' | 'phone' | 'dob') => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onClearFilters: () => void;
  onShowImport: () => void;
  showImport: boolean;
  projectFilter: string;
  onProjectFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  procedureOrderFilter: string;
  onProcedureOrderFilterChange: (value: string) => void;
  sortBy: 'date_asc' | 'date_desc' | 'procedure_ordered' | 'project' | 'name_asc' | 'name_desc';
  onSortChange: (value: 'date_asc' | 'date_desc' | 'procedure_ordered' | 'project' | 'name_asc' | 'name_desc') => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  serviceFilter: string;
  onServiceFilterChange: (value: string) => void;
  isProjectSpecificView?: boolean; // New prop to indicate we're in a project-specific view
}
export const AppointmentFilters: React.FC<AppointmentFiltersProps> = ({
  searchTerm,
  onSearchChange,
  searchType,
  onSearchTypeChange,
  dateRange,
  onDateRangeChange,
  onClearFilters,
  onShowImport,
  showImport,
  projectFilter,
  onProjectFilterChange,
  statusFilter,
  onStatusFilterChange,
  procedureOrderFilter,
  onProcedureOrderFilterChange,
  sortBy,
  onSortChange,
  locationFilter,
  onLocationFilterChange,
  serviceFilter,
  onServiceFilterChange,
  isProjectSpecificView = false
}) => {
  const { isAdmin } = useRole();
  const [projects, setProjects] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  useEffect(() => {
    fetchProjects();
    fetchStatusOptions();
    fetchLocationAndServiceOptions();
  }, [projectFilter]);
  const fetchProjects = async () => {
    try {
      const {
        data
      } = await supabase.from('all_appointments').select('project_name').not('project_name', 'is', null);
      if (data) {
        const uniqueProjects = [...new Set(data.map(item => item.project_name))].sort();
        setProjects(uniqueProjects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };
  const fetchStatusOptions = async () => {
    const statuses = await getBaseStatusOptions();
    setStatusOptions(statuses);
  };

  const fetchLocationAndServiceOptions = async () => {
    try {
      let query = supabase
        .from('all_appointments')
        .select('calendar_name')
        .not('calendar_name', 'is', null);
      
      // Filter by project if we're in a project-specific view
      if (projectFilter && projectFilter !== 'ALL') {
        const normalizedProject = projectFilter.trim();
        if (normalizedProject !== projectFilter) {
          query = query.or(`project_name.eq.${projectFilter},project_name.eq.${normalizedProject}`);
        } else {
          query = query.eq('project_name', projectFilter);
        }
      }
      
      const { data } = await query;
      
      if (data) {
        const locations = new Set<string>();
        const services = new Set<string>();
        
        data.forEach(item => {
          if (item.calendar_name) {
            // Extract location: try hyphen pattern first (Texas Vascular), then "at" pattern (Fayette Surgical)
            let locationMatch = item.calendar_name.match(/ - (.+)$/);
            if (!locationMatch) {
              locationMatch = item.calendar_name.match(/at\s+(.+)$/);
            }
            
            if (locationMatch && locationMatch[1]) {
              const location = locationMatch[1].trim();
              // Exclude Somerset, KY from location options
              if (!location.toLowerCase().includes('somerset')) {
                locations.add(location);
              }
            }
            
            // Extract service: text between quotes or after "your " and before " Consultation"
            const serviceMatch = item.calendar_name.match(/your\s+["']?([^"']+)["']?\s+Consultation/i);
            if (serviceMatch && serviceMatch[1]) {
              let service = serviceMatch[1].trim();
              // Merge In-person with GAE - they are the same service type
              if (service.toLowerCase() === 'in-person') {
                service = 'GAE';
              }
              services.add(service);
            }
          }
        });
        
        setLocationOptions(Array.from(locations).sort());
        setServiceOptions(Array.from(services).sort());
      }
    } catch (error) {
      console.error('Error fetching location/service options:', error);
    }
  };
  const getDateRangeText = () => {
    if (!dateRange.from && !dateRange.to) return 'All dates';
    if (dateRange.from && !dateRange.to) {
      return `From ${format(dateRange.from, "MMM dd, yyyy")}`;
    }
    if (!dateRange.from && dateRange.to) {
      return `Until ${format(dateRange.to, "MMM dd, yyyy")}`;
    }
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return format(dateRange.from, "MMM dd, yyyy");
      }
      return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
    }
    return 'Select date range';
  };
  const setQuickDateRange = (type: 'today' | 'week' | 'month') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    switch (type) {
      case 'today':
        onDateRangeChange({
          from: today,
          to: today
        });
        break;
      case 'week':
        onDateRangeChange({
          from: startOfWeek(today),
          to: today
        });
        break;
      case 'month':
        onDateRangeChange({
          from: startOfMonth(today),
          to: endOfMonth(today)
        });
        break;
    }
  };
  return <div className="portal-spacing">
      {/* Admin Actions - Import CSV - Collapsible */}
      {isAdmin() && !showImport && (
        <Collapsible defaultOpen={false} className="portal-section">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between hover:bg-accent p-4"
            >
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Data Management</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Data Management</h3>
                <p className="text-sm text-muted-foreground">Import historical appointment data and sync insurance info from leads</p>
              </div>
              <div className="flex gap-2">
                <InsuranceSyncTrigger />
                <Button onClick={onShowImport} variant="outline" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Compact Filter Bar */}
      <div className="rounded-xl bg-muted/30 p-4 space-y-3">
        {/* Primary filters row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search group */}
          <div className="flex items-center gap-1 bg-background rounded-lg border border-border/50 px-2 shadow-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={searchType} onValueChange={onSearchTypeChange}>
              <SelectTrigger className="w-[80px] border-0 shadow-none h-8 text-xs px-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder={searchType === 'name' ? "Search patient..." : "Search phone..."}
              value={searchTerm} 
              onChange={e => onSearchChange(e.target.value)} 
              className="w-[160px] border-0 shadow-none h-8 text-sm focus-visible:ring-0" 
            />
          </div>

          {!isProjectSpecificView && (
            <Select value={projectFilter} onValueChange={onProjectFilterChange}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                {projects.map(project => <SelectItem key={project} value={project}>{project}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {statusOptions.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={procedureOrderFilter} onValueChange={onProcedureOrderFilterChange}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="All Procedures" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Procedures</SelectItem>
              <SelectItem value="ordered">Procedure Ordered</SelectItem>
              <SelectItem value="imaging_ordered">Imaging Ordered</SelectItem>
              <SelectItem value="no_procedure">No Procedure Ordered</SelectItem>
              <SelectItem value="not_covered">Procedure Not Covered</SelectItem>
              <SelectItem value="null">Not Set</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest First</SelectItem>
              <SelectItem value="date_asc">Oldest First</SelectItem>
              <SelectItem value="procedure_ordered">Procedure Status</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={onLocationFilterChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Locations</SelectItem>
              {locationOptions.map(location => (
                <SelectItem key={location} value={location}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={serviceFilter} onValueChange={onServiceFilterChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Services</SelectItem>
              {serviceOptions.map(service => (
                <SelectItem key={service} value={service}>{service}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date filter toggle */}
          <Collapsible open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Dates
                {(dateRange.from || dateRange.to) && (
                  <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full">1</Badge>
                )}
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", advancedFiltersOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          {/* Clear all button - only show when filters active */}
          {(searchTerm || statusFilter !== 'ALL' || procedureOrderFilter !== 'ALL' || locationFilter !== 'ALL' || serviceFilter !== 'ALL' || dateRange.from || dateRange.to || (!isProjectSpecificView && projectFilter !== 'ALL')) && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground">
              Clear all
            </Button>
          )}
        </div>

        {/* Active filter chips */}
        {(searchTerm || statusFilter !== 'ALL' || procedureOrderFilter !== 'ALL' || locationFilter !== 'ALL' || serviceFilter !== 'ALL' || dateRange.from || (!isProjectSpecificView && projectFilter !== 'ALL')) && (
          <div className="flex flex-wrap gap-1.5">
            {searchTerm && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                {searchType === 'name' ? 'Name' : 'Phone'}: {searchTerm}
                <button onClick={() => onSearchChange('')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {!isProjectSpecificView && projectFilter !== 'ALL' && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                {projectFilter}
                <button onClick={() => onProjectFilterChange('ALL')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {statusFilter !== 'ALL' && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                {statusFilter}
                <button onClick={() => onStatusFilterChange('ALL')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {procedureOrderFilter !== 'ALL' && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                {procedureOrderFilter}
                <button onClick={() => onProcedureOrderFilterChange('ALL')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {locationFilter !== 'ALL' && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                {locationFilter}
                <button onClick={() => onLocationFilterChange('ALL')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {serviceFilter !== 'ALL' && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                {serviceFilter}
                <button onClick={() => onServiceFilterChange('ALL')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {(dateRange.from || dateRange.to) && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                {getDateRangeText()}
                <button onClick={() => onDateRangeChange({ from: undefined, to: undefined })} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
              </Badge>
            )}
          </div>
        )}

        {/* Collapsible date section */}
        <Collapsible open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
          <CollapsibleContent className="pt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setQuickDateRange('today')} className="rounded-full h-7 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Today
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setQuickDateRange('week')} className="rounded-full h-7 text-xs">
                <CalendarRange className="h-3 w-3 mr-1" />
                This Week
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setQuickDateRange('month')} className="rounded-full h-7 text-xs">
                <CalendarIcon className="h-3 w-3 mr-1" />
                This Month
              </Button>

              <div className="h-4 w-px bg-border mx-1" />

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-7 text-xs rounded-full", !dateRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateRange.from ? format(dateRange.from, "MMM dd") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateRange.from} onSelect={date => onDateRangeChange({ ...dateRange, from: date })} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">→</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-7 text-xs rounded-full", !dateRange.to && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateRange.to ? format(dateRange.to, "MMM dd") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateRange.to} onSelect={date => onDateRangeChange({ ...dateRange, to: date })} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>;
};