
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Refresh } from 'lucide-react';

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
              <Refresh className="h-4 w-4" />
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
              <div className="space-y-2">
                {calls.map((call) => (
                  <div key={call.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{call.lead_name}</h3>
                        <p className="text-sm text-gray-600">{call.project_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(call.call_datetime).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{call.status}</p>
                        <p className="text-sm text-gray-500">{call.direction}</p>
                        {call.agent && (
                          <p className="text-sm text-gray-500">Agent: {call.agent}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllCallsManager;
