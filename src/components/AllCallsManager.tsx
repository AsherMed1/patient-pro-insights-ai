
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Phone, Calendar, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Call {
  id: string;
  date: string;
  lead_name: string;
  project_name: string;
  lead_phone_number: string;
  direction: string;
  status: string;
  agent: string | null;
  call_datetime: string;
  duration_seconds: number;
  recording_url: string | null;
  call_summary: string | null;
}

const AllCallsManager = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 50;
  const { toast } = useToast();

  const fetchCalls = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // Get total count
      const { count, error: countError } = await supabase
        .from('all_calls')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      // Get paginated data
      const { data, error } = await supabase
        .from('all_calls')
        .select('*')
        .order('call_datetime', { ascending: false })
        .range((page - 1) * recordsPerPage, page * recordsPerPage - 1);
      
      if (error) throw error;
      
      setCalls(data || []);
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / recordsPerPage));
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch calls data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handlePageChange = (page: number) => {
    fetchCalls(page);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading calls...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">All Calls Manager</CardTitle>
              <CardDescription>Manage and view all call records</CardDescription>
            </div>
            <Button 
              onClick={() => fetchCalls(currentPage)}
              className="flex items-center gap-2"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {calls.length} of {totalRecords} calls
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Button 
                    variant="outline" 
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button 
                    variant="outline" 
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
            
            {calls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No calls found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Lead Name</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {new Date(call.call_datetime).toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{call.lead_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {call.project_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">{call.lead_phone_number}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            call.direction === 'inbound' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {call.direction}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            call.status === 'completed' || call.status === 'answered'
                              ? 'bg-green-100 text-green-800'
                              : call.status === 'missed' || call.status === 'no-answer'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {call.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {call.agent || 'Unassigned'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDuration(call.duration_seconds)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllCallsManager;
