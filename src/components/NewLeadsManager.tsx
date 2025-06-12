import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, User } from 'lucide-react';

interface Lead {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  times_called: number;
  phone_number: string | null;
  email: string | null;
  status: string | null;
  created_at: string;
}

const NewLeadsManager = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 50;
  const { toast } = useToast();

  const fetchLeads = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // Get total count
      const { count, error: countError } = await supabase
        .from('new_leads')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      // Get paginated data
      const { data, error } = await supabase
        .from('new_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * recordsPerPage, page * recordsPerPage - 1);
      
      if (error) throw error;
      
      setLeads(data || []);
      setTotalRecords(count || 0);
      setTotalPages(Math.ceil((count || 0) / recordsPerPage));
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handlePageChange = (page: number) => {
    fetchLeads(page);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">New Leads Manager</CardTitle>
              <CardDescription>Manage and view all lead records</CardDescription>
            </div>
            <Button 
              onClick={() => fetchLeads(currentPage)}
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
                Showing {leads.length} of {totalRecords} leads
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
            
            {leads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No leads found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map((lead) => (
                  <div key={lead.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <h3 className="font-semibold">{lead.lead_name}</h3>
                          <p className="text-sm text-gray-600">{lead.project_name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(lead.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Called: {lead.times_called} times</p>
                        {lead.phone_number && (
                          <p className="text-sm text-gray-500">{lead.phone_number}</p>
                        )}
                        {lead.status && (
                          <p className="text-sm text-gray-500">Status: {lead.status}</p>
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

export default NewLeadsManager;
