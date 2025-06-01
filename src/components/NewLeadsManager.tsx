
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Phone, Calendar, User, Building } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface NewLead {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  times_called: number;
  created_at: string;
  updated_at: string;
}

const NewLeadsManager = () => {
  const [leads, setLeads] = useState<NewLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    project_name: '',
    lead_name: '',
    times_called: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('new_leads')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_name || !formData.lead_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('new_leads')
        .insert([formData]);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "New lead added successfully"
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        project_name: '',
        lead_name: '',
        times_called: 0
      });
      
      fetchLeads();
    } catch (error) {
      console.error('Error adding lead:', error);
      toast({
        title: "Error",
        description: "Failed to add lead",
        variant: "destructive"
      });
    }
  };

  const incrementCalls = async (leadId: string, currentCalls: number) => {
    try {
      const { error } = await supabase
        .from('new_leads')
        .update({ times_called: currentCalls + 1 })
        .eq('id', leadId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Call count updated"
      });
      
      fetchLeads();
    } catch (error) {
      console.error('Error updating call count:', error);
      toast({
        title: "Error",
        description: "Failed to update call count",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Add New Lead Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PlusCircle className="h-5 w-5" />
            <span>Add New Lead</span>
          </CardTitle>
          <CardDescription>
            Record new leads and track call attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project_name">Project Name</Label>
                <Input
                  id="project_name"
                  type="text"
                  placeholder="Enter project name"
                  value={formData.project_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lead_name">Lead Name</Label>
                <Input
                  id="lead_name"
                  type="text"
                  placeholder="Enter lead name"
                  value={formData.lead_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="times_called">Times Called</Label>
                <Input
                  id="times_called"
                  type="number"
                  min="0"
                  value={formData.times_called}
                  onChange={(e) => setFormData(prev => ({ ...prev, times_called: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full">
              Add Lead
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>
            {leads.length} lead{leads.length !== 1 ? 's' : ''} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading leads...</div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No leads recorded yet</div>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div key={lead.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{lead.lead_name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{lead.project_name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{formatDate(lead.date)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{lead.times_called} calls</span>
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => incrementCalls(lead.id, lead.times_called)}
                      >
                        + Call
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NewLeadsManager;
