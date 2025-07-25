import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { Phone, Clock, User, Building, ExternalLink } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeForTable } from '@/utils/dateTimeUtils';
import AllCallsImport from './AllCallsImport';
import AppointmentsPagination from './appointments/AppointmentsPagination';

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

interface AllCallsManagerProps {
  projectFilter?: string;
}

const RECORDS_PER_PAGE = 50;

const AllCallsManager = ({ projectFilter }: AllCallsManagerProps) => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const { toast } = useToast();

  const totalPages = Math.ceil(totalRecords / RECORDS_PER_PAGE);

  const fetchCalls = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // First get the total count
      let countQuery = supabase
        .from('all_calls')
        .select('*', { count: 'exact', head: true });
      
      if (projectFilter) {
        countQuery = countQuery.eq('project_name', projectFilter);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      
      setTotalRecords(count || 0);

      // Then get the paginated data
      const from = (page - 1) * RECORDS_PER_PAGE;
      const to = from + RECORDS_PER_PAGE - 1;
      
      let callsQuery = supabase
        .from('all_calls')
        .select('*')
        .order('call_datetime', { ascending: false })
        .range(from, to);
      
      if (projectFilter) {
        callsQuery = callsQuery.eq('project_name', projectFilter);
      }
      
      const { data, error } = await callsQuery;
      
      if (error) throw error;
      setCalls(data || []);
      setCurrentPage(page);
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

  const handlePageChange = (page: number) => {
    fetchCalls(page);
  };

  useEffect(() => {
    fetchCalls(1);
    setCurrentPage(1);
  }, [projectFilter]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateTimeString: string) => {
    return formatDateTimeForTable(dateTimeString);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Call Records Management</CardTitle>
          <CardDescription>
            Import and manage call records for your projects
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="import" className="w-full">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="view">View Data</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <AllCallsImport />
        </TabsContent>

        <TabsContent value="view" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {projectFilter ? `${projectFilter} - All Calls` : 'All Calls'}
              </CardTitle>
              <CardDescription>
                {totalRecords} call{totalRecords !== 1 ? 's' : ''} recorded (Times in Central Time Zone)
                {projectFilter && ` for ${projectFilter}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading calls...</div>
                </div>
              ) : totalRecords === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No call records yet. Import some data to get started.</div>
                </div>
              ) : (
                <>
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
                  
                  <AppointmentsPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={totalRecords}
                    recordsPerPage={RECORDS_PER_PAGE}
                    onPageChange={handlePageChange}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AllCallsManager;
