import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from '@/integrations/supabase/client';
import { Phone, Clock, User, Building, ExternalLink, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeForTable } from '@/utils/dateTimeUtils';
import PaginationControls from './shared/PaginationControls';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CallRecord {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  lead_phone_number: string;
  call_datetime: string;
  direction: string;
  status: string;
  duration_seconds: number;
  agent: string | null;
  recording_url: string | null;
  call_summary: string | null;
  created_at: string;
  updated_at: string;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface AllCallsManagerProps {
  projectFilter?: string;
}

const AllCallsManager = ({ projectFilter }: AllCallsManagerProps) => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const { toast } = useToast();
  
  const CALLS_PER_PAGE = 50;

  useEffect(() => {
    setCurrentPage(1);
    fetchCalls();
  }, [projectFilter, dateRange]);

  useEffect(() => {
    fetchCalls();
  }, [currentPage]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      
      // Build the base query
      let callsQuery = supabase
        .from('all_calls')
        .select('*', { count: 'exact' })
        .order('call_datetime', { ascending: false });
      
      // Apply project filter
      if (projectFilter) {
        callsQuery = callsQuery.eq('project_name', projectFilter);
      }
      
      // Apply date range filter
      if (dateRange.from) {
        callsQuery = callsQuery.gte('date', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        callsQuery = callsQuery.lte('date', format(dateRange.to, 'yyyy-MM-dd'));
      }
      
      // Apply pagination
      const from = (currentPage - 1) * CALLS_PER_PAGE;
      const to = from + CALLS_PER_PAGE - 1;
      callsQuery = callsQuery.range(from, to);
      
      const { data, error, count } = await callsQuery;
      
      if (error) throw error;
      setCalls(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch calls",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateTimeString: string) => {
    return formatDateTimeForTable(dateTimeString);
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

  const totalPages = Math.ceil(totalCount / CALLS_PER_PAGE);
  const startRecord = (currentPage - 1) * CALLS_PER_PAGE + 1;
  const endRecord = Math.min(currentPage * CALLS_PER_PAGE, totalCount);

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Date Range:</span>
            </div>
            
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "MMM dd") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                    initialFocus
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "MMM dd") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                    initialFocus
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              variant="outline" 
              onClick={() => setDateRange({ from: undefined, to: undefined })}
              className="w-fit"
            >
              Clear Filters
            </Button>

            <div className="text-sm text-muted-foreground">
              Showing: {getDateRangeText()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calls List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {projectFilter ? `${projectFilter} - All Calls` : 'All Calls'}
          </CardTitle>
          <CardDescription>
            Showing {totalCount > 0 ? startRecord : 0}-{endRecord} of {totalCount} call{totalCount !== 1 ? 's' : ''} (Times in Central Time Zone)
            {projectFilter && ` for ${projectFilter}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Top Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemsPerPage={CALLS_PER_PAGE}
            onPageChange={setCurrentPage}
            className="mb-4 border-b pb-4"
          />

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading calls...</div>
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No call records yet</div>
            </div>
          ) : (
            <div className="space-y-4">
              {calls.map((call) => (
                <div key={call.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{call.lead_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{call.lead_phone_number}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{call.project_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{formatDateTime(call.call_datetime)}</span>
                        </div>
                      </div>
                      
                      {call.agent && (
                        <div className="text-sm text-gray-600">
                          <strong>Agent:</strong> {call.agent}
                        </div>
                      )}
                      
                      {call.call_summary && (
                        <div className="text-sm text-gray-600">
                          <strong>Summary:</strong> {call.call_summary}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={call.direction === 'inbound' ? 'default' : 'secondary'}>
                          {call.direction}
                        </Badge>
                        <Badge variant="outline">
                          {call.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        Duration: {formatDuration(call.duration_seconds)}
                      </div>
                      
                      {call.recording_url && (
                        <a
                          href={call.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Recording</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Bottom Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemsPerPage={CALLS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AllCallsManager;
