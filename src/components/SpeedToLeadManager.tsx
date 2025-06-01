
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SpeedToLeadStat {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  lead_phone_number: string;
  date_time_in: string;
  date_time_of_first_call: string | null;
  speed_to_lead_time_min: number | null;
  created_at: string;
  updated_at: string;
}

interface Client {
  client_id: string;
  name: string;
}

const SpeedToLeadManager = () => {
  const [stats, setStats] = useState<SpeedToLeadStat[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: '',
    project_name: '',
    lead_name: '',
    lead_phone_number: '',
    date_time_in: '',
    date_time_of_first_call: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('client_id, name')
        .order('name');

      if (error) {
        console.error('Error fetching clients:', error);
      } else {
        setClients(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('speed_to_lead_stats')
        .select('*')
        .order('date_time_in', { ascending: false });

      if (error) {
        console.error('Error fetching speed to lead stats:', error);
        toast({
          title: "Error",
          description: "Failed to fetch speed to lead statistics",
          variant: "destructive",
        });
      } else {
        setStats(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('speed_to_lead_stats')
        .insert([{
          date: formData.date,
          project_name: formData.project_name,
          lead_name: formData.lead_name,
          lead_phone_number: formData.lead_phone_number,
          date_time_in: formData.date_time_in,
          date_time_of_first_call: formData.date_time_of_first_call || null
        }]);

      if (error) {
        console.error('Error adding speed to lead stat:', error);
        toast({
          title: "Error",
          description: "Failed to add speed to lead statistic",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Speed to lead statistic added successfully",
        });
        setFormData({
          date: '',
          project_name: '',
          lead_name: '',
          lead_phone_number: '',
          date_time_in: '',
          date_time_of_first_call: ''
        });
        fetchStats();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return 'N/A';
    try {
      return format(new Date(dateTimeString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return dateTimeString;
    }
  };

  const formatSpeedToLead = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Speed to Lead Statistic</CardTitle>
          <CardDescription>Record lead response time statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name</Label>
              <Select value={formData.project_name} onValueChange={(value) => setFormData(prev => ({ ...prev, project_name: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client/project" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.client_id} value={client.name}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead_name">Lead Name</Label>
              <Input
                id="lead_name"
                name="lead_name"
                value={formData.lead_name}
                onChange={handleInputChange}
                placeholder="Enter lead name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead_phone_number">Lead Phone Number</Label>
              <Input
                id="lead_phone_number"
                name="lead_phone_number"
                value={formData.lead_phone_number}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date_time_in">Date Time In</Label>
              <Input
                id="date_time_in"
                name="date_time_in"
                type="datetime-local"
                value={formData.date_time_in}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date_time_of_first_call">Date Time of First Call</Label>
              <Input
                id="date_time_of_first_call"
                name="date_time_of_first_call"
                type="datetime-local"
                value={formData.date_time_of_first_call}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="md:col-span-2">
              <Button type="submit" className="w-full">
                Add Speed to Lead Statistic
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Speed to Lead Statistics</CardTitle>
          <CardDescription>View all recorded speed to lead data</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading statistics...</div>
          ) : stats.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No statistics recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Project</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Lead Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Phone</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Time In</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">First Call</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Speed to Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
                    <tr key={stat.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{stat.date}</td>
                      <td className="border border-gray-300 px-4 py-2">{stat.project_name}</td>
                      <td className="border border-gray-300 px-4 py-2">{stat.lead_name}</td>
                      <td className="border border-gray-300 px-4 py-2">{stat.lead_phone_number}</td>
                      <td className="border border-gray-300 px-4 py-2">{formatDateTime(stat.date_time_in)}</td>
                      <td className="border border-gray-300 px-4 py-2">{formatDateTime(stat.date_time_of_first_call)}</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold">
                        {formatSpeedToLead(stat.speed_to_lead_time_min)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpeedToLeadManager;
