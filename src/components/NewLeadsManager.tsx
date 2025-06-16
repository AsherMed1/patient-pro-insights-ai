
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, User, Phone, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Lead Name</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Times Called</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {new Date(lead.date).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{lead.lead_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {lead.project_name}
                        </TableCell>
                        <TableCell>
                          {lead.phone_number ? (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{lead.phone_number}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No phone</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {lead.email || 'No email'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            lead.times_called === 0 
                              ? 'bg-red-100 text-red-800' 
                              : lead.times_called < 3
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {lead.times_called} calls
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            lead.status === 'contacted'
                              ? 'bg-green-100 text-green-800'
                              : lead.status === 'attempted'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.status || 'New'}
                          </span>
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

export default NewLeadsManager;
