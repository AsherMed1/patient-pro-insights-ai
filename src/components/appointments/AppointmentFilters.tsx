import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, Calendar as CalendarIcon, Filter, Search, Clock, CalendarRange, Zap, Building2, CheckCircle, ArrowUpDown, ChevronDown, Activity } from 'lucide-react';
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

      {/* Search and Filter Panel */}
      <div className="portal-section">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Search & Filter Appointments</h3>
        </div>
        
        <div className="space-y-6">
          {/* Search Bar and Project Filter */}
          <div className="flex flex-nowrap items-center gap-3 overflow-x-auto">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Select value={searchType} onValueChange={onSearchTypeChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                placeholder={
                  searchType === 'name' ? "Search by patient name..." :
                  searchType === 'phone' ? "Search by phone number..." :
                  "Search by DOB (YYYY-MM-DD)..."
                } 
                value={searchTerm} 
                onChange={e => onSearchChange(e.target.value)} 
                className="w-[240px]" 
              />
            </div>
            
            
            {/* Project Filter - Only show if not in project-specific view */}
            {!isProjectSpecificView && (
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Select value={projectFilter} onValueChange={onProjectFilterChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Projects</SelectItem>
                    {projects.map(project => <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {statusOptions.map(status => <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select value={procedureOrderFilter} onValueChange={onProcedureOrderFilterChange}>
                <SelectTrigger className="w-[200px]">
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
            </div>
            
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Date (Newest First)</SelectItem>
                  <SelectItem value="date_asc">Date (Oldest First)</SelectItem>
                  <SelectItem value="procedure_ordered">Sort by Procedure Status</SelectItem>
                  <SelectItem value="project">Sort by Project</SelectItem>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select value={locationFilter} onValueChange={onLocationFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Locations</SelectItem>
                  {locationOptions.map(location => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <Select value={serviceFilter} onValueChange={onServiceFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Services</SelectItem>
                  {serviceOptions.map(service => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Advanced Filters - Collapsible */}
          <div className="border-t border-border pt-4">
            <Collapsible open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Advanced Date Filters</span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      advancedFiltersOpen && "rotate-180"
                    )} 
                  />
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 pt-4">
                {/* Quick Filters */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Quick Filters:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setQuickDateRange('today')} className="quick-filter-btn">
                      <Clock className="h-3 w-3 mr-1" />
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setQuickDateRange('week')} className="quick-filter-btn">
                      <CalendarRange className="h-3 w-3 mr-1" />
                      This Week
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setQuickDateRange('month')} className="quick-filter-btn">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      This Month
                    </Button>
                  </div>
                </div>

                {/* Custom Date Range */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Custom Date Range:</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? format(dateRange.from, "MMM dd") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateRange.from} onSelect={date => onDateRangeChange({
                        ...dateRange,
                        from: date
                      })} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.to ? format(dateRange.to, "MMM dd") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateRange.to} onSelect={date => onDateRangeChange({
                        ...dateRange,
                        to: date
                      })} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>

                    <Button variant="outline" onClick={onClearFilters} className="text-sm">
                      Clear All
                    </Button>
                  </div>

                  {/* Current Filter Display */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Showing:</span>
                    <span className="font-bold text-base text-foreground">{getDateRangeText()}</span>
                    {!isProjectSpecificView && projectFilter !== 'ALL' && <>
                        <span>•</span>
                        <span>Project: "{projectFilter}"</span>
                      </>}
                    {statusFilter !== 'ALL' && <>
                        <span>•</span>
                        <span>Status: "{statusFilter}"</span>
                      </>}
                    {procedureOrderFilter !== 'ALL' && <>
                        <span>•</span>
                        <span>Procedure: "{procedureOrderFilter === 'true' ? 'Ordered' : procedureOrderFilter === 'false' ? 'No Procedure' : 'Not Set'}"</span>
                      </>}
                     {searchTerm && <>
                        <span>•</span>
                        <span>Search ({searchType === 'name' ? 'Name' : searchType === 'phone' ? 'Phone' : 'DOB'}): "{searchTerm}"</span>
                      </>}
                    {locationFilter !== 'ALL' && <>
                        <span>•</span>
                        <span>Location: "{locationFilter}"</span>
                      </>}
                    {serviceFilter !== 'ALL' && <>
                        <span>•</span>
                        <span>Service: "{serviceFilter}"</span>
                      </>}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>;
};