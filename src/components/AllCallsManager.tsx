
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Phone, Clock, User, Building, ExternalLink } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

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

const AllCallsManager = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    project_name: '',
    lead_name: '',
    lead_phone_number: '',
    call_datetime: new Date().toISOString().slice(0, 16),
    direction: 'outbound',
    status: '',
    duration_seconds: 0,
    agent: '',
    recording_url: '',
    call_summary: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('all_calls')
        .select('*')
        .order('call_datetime', { ascending: false });
      
      if (error) throw error;
      setCalls(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_name || !formData.lead_name || !formData.lead_phone_number || !formData.status) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('all_calls')
        .insert([{
          ...formData,
          agent: formData.agent || null,
          recording_url: formData.recording_url || null,
          call_summary: formData.call_summary || null
        }]);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Call record added successfully"
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        project_name: '',
        lead_name: '',
        lead_phone_number: '',
        call_datetime: new Date().toISOString().slice(0, 16),
        direction: 'outbound',
        status: '',
        duration_seconds: 0,
        agent: '',
        recording_url: '',
        call_summary: ''
      });
      
      fetchCalls();
    } catch (error) {
      console.error('Error adding call:', error);
      toast({
        title: "Error",
        description: "Failed to add call record",
        variant: "destructive"
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Add New Call Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PlusCircle className="h-5 w-5" />
            <span>Add New Call Record</span>
          </CardTitle>
          <CardDescription>
            Record call information and outcomes
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
                <Label htmlFor="call_datetime">Date & Time of Call</Label>
                <Input
                  id="call_datetime"
                  type="datetime-local"
                  value={formData.call_datetime}
                  onChange={(e) => setFormData(prev => ({ ...prev, call_datetime: e.target.value }))}
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
                <Label htmlFor="lead_phone_number">Lead Phone Number</Label>
                <Input
                  id="lead_phone_number"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.lead_phone_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_phone_number: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select value={formData.direction} onValueChange={(value) => setFormData(prev => ({ ...prev, direction: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Input
                  id="status"
                  type="text"
                  placeholder="e.g., Answered, No Answer, Busy"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration_seconds">Duration (Seconds)</Label>
                <Input
                  id="duration_seconds"
                  type="number"
                  min="0"
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_seconds: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agent">Agent</Label>
                <Input
                  id="agent"
                  type="text"
                  placeholder="Enter agent name"
                  value={formData.agent}
                  onChange={(e) => setFormData(prev => ({ ...prev, agent: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recording_url">Recording URL</Label>
                <Input
                  id="recording_url"
                  type="url"
                  placeholder="Enter recording URL"
                  value={formData.recording_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, recording_url: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="call_summary">Call Summary</Label>
              <Input
                id="call_summary"
                type="text"
                placeholder="Enter call summary"
                value={formData.call_summary}
                onChange={(e) => setFormData(prev => ({ ...prev, call_summary: e.target.value }))}
              />
            </div>
            
            <Button type="submit" className="w-full">
              Add Call Record
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Calls List */}
      <Card>
        <CardHeader>
          <CardTitle>All Call Records</CardTitle>
          <CardDescription>
            {calls.length} call record{calls.length !== 1 ? 's' : ''} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AllCallsManager;
