
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Calendar, User, Building, Phone, Mail, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface AllAppointment {
  id: string;
  date_appointment_created: string;
  date_of_appointment: string | null;
  project_name: string;
  lead_name: string;
  lead_email: string | null;
  lead_phone_number: string | null;
  calendar_name: string | null;
  requested_time: string | null;
  stage_booked: string | null;
  showed: boolean | null;
  confirmed: boolean | null;
  agent: string | null;
  agent_number: string | null;
  ghl_id: string | null;
  confirmed_number: string | null;
  created_at: string;
  updated_at: string;
}

interface Client {
  client_id: string;
  name: string;
}

const AllAppointmentsManager = () => {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date_appointment_created: new Date().toISOString().split('T')[0],
    date_of_appointment: '',
    project_name: '',
    lead_name: '',
    lead_email: '',
    lead_phone_number: '',
    calendar_name: '',
    requested_time: '',
    stage_booked: '',
    showed: false,
    confirmed: false,
    agent: '',
    agent_number: '',
    ghl_id: '',
    confirmed_number: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();
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

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('all_appointments')
        .select('*')
        .order('date_appointment_created', { ascending: false });
      
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_name || !formData.lead_name || !formData.date_appointment_created) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const submitData = {
        ...formData,
        date_of_appointment: formData.date_of_appointment || null,
        lead_email: formData.lead_email || null,
        lead_phone_number: formData.lead_phone_number || null,
        calendar_name: formData.calendar_name || null,
        requested_time: formData.requested_time || null,
        stage_booked: formData.stage_booked || null,
        agent: formData.agent || null,
        agent_number: formData.agent_number || null,
        ghl_id: formData.ghl_id || null,
        confirmed_number: formData.confirmed_number || null
      };

      const { error } = await supabase
        .from('all_appointments')
        .insert([submitData]);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment added successfully"
      });

      setFormData({
        date_appointment_created: new Date().toISOString().split('T')[0],
        date_of_appointment: '',
        project_name: '',
        lead_name: '',
        lead_email: '',
        lead_phone_number: '',
        calendar_name: '',
        requested_time: '',
        stage_booked: '',
        showed: false,
        confirmed: false,
        agent: '',
        agent_number: '',
        ghl_id: '',
        confirmed_number: ''
      });
      
      fetchAppointments();
    } catch (error) {
      console.error('Error adding appointment:', error);
      toast({
        title: "Error",
        description: "Failed to add appointment",
        variant: "destructive"
      });
    }
  };

  const toggleShowedStatus = async (appointmentId: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({ showed: !currentStatus })
        .eq('id', appointmentId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Showed status updated"
      });
      
      fetchAppointments();
    } catch (error) {
      console.error('Error updating showed status:', error);
      toast({
        title: "Error",
        description: "Failed to update showed status",
        variant: "destructive"
      });
    }
  };

  const toggleConfirmedStatus = async (appointmentId: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({ confirmed: !currentStatus })
        .eq('id', appointmentId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Confirmed status updated"
      });
      
      fetchAppointments();
    } catch (error) {
      console.error('Error updating confirmed status:', error);
      toast({
        title: "Error",
        description: "Failed to update confirmed status",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'Not set';
  };

  const formatTime = (timeString: string | null) => {
    return timeString ? timeString : 'Not set';
  };

  return (
    <div className="space-y-6">
      {/* Add New Appointment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PlusCircle className="h-5 w-5" />
            <span>Add New Appointment</span>
          </CardTitle>
          <CardDescription>
            Record new appointments with complete details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_appointment_created">Date Appointment Created *</Label>
                <Input
                  id="date_appointment_created"
                  type="date"
                  value={formData.date_appointment_created}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_appointment_created: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date_of_appointment">Date Of Appointment</Label>
                <Input
                  id="date_of_appointment"
                  type="date"
                  value={formData.date_of_appointment}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_appointment: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project_name">Project Name *</Label>
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
                <Label htmlFor="lead_name">Lead Name *</Label>
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
                <Label htmlFor="lead_email">Lead Email</Label>
                <Input
                  id="lead_email"
                  type="email"
                  placeholder="Enter lead email"
                  value={formData.lead_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_email: e.target.value }))}
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
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="calendar_name">Calendar Name</Label>
                <Input
                  id="calendar_name"
                  type="text"
                  placeholder="Enter calendar name"
                  value={formData.calendar_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, calendar_name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requested_time">Requested Time</Label>
                <Input
                  id="requested_time"
                  type="time"
                  value={formData.requested_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, requested_time: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stage_booked">Stage Booked</Label>
                <Input
                  id="stage_booked"
                  type="text"
                  placeholder="Enter stage booked"
                  value={formData.stage_booked}
                  onChange={(e) => setFormData(prev => ({ ...prev, stage_booked: e.target.value }))}
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
                <Label htmlFor="agent_number">Agent Number</Label>
                <Input
                  id="agent_number"
                  type="text"
                  placeholder="Enter agent number"
                  value={formData.agent_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, agent_number: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ghl_id">GHL ID</Label>
                <Input
                  id="ghl_id"
                  type="text"
                  placeholder="Enter GHL ID"
                  value={formData.ghl_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, ghl_id: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmed_number">Confirmed #</Label>
                <Input
                  id="confirmed_number"
                  type="text"
                  placeholder="Enter confirmed number"
                  value={formData.confirmed_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmed_number: e.target.value }))}
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full">
              Add Appointment
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading appointments...</div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No appointments recorded yet</div>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{appointment.lead_name}</span>
                        {appointment.lead_email && (
                          <>
                            <Mail className="h-4 w-4 text-gray-500 ml-4" />
                            <span className="text-sm text-gray-600">{appointment.lead_email}</span>
                          </>
                        )}
                        {appointment.lead_phone_number && (
                          <>
                            <Phone className="h-4 w-4 text-gray-500 ml-4" />
                            <span className="text-sm text-gray-600">{appointment.lead_phone_number}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{appointment.project_name}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {formatDate(appointment.date_appointment_created)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Appointment: {formatDate(appointment.date_of_appointment)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Time: {formatTime(appointment.requested_time)}</span>
                        </div>
                        
                        {appointment.calendar_name && (
                          <div>Calendar: {appointment.calendar_name}</div>
                        )}
                        
                        {appointment.stage_booked && (
                          <div>Stage: {appointment.stage_booked}</div>
                        )}
                        
                        {appointment.agent && (
                          <div>Agent: {appointment.agent} {appointment.agent_number && `(${appointment.agent_number})`}</div>
                        )}
                        
                        {appointment.ghl_id && (
                          <div>GHL ID: {appointment.ghl_id}</div>
                        )}
                        
                        {appointment.confirmed_number && (
                          <div>Confirmed #: {appointment.confirmed_number}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={appointment.showed ? "default" : "secondary"} 
                        className="flex items-center space-x-1 cursor-pointer"
                        onClick={() => toggleShowedStatus(appointment.id, appointment.showed)}
                      >
                        {appointment.showed ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>{appointment.showed ? 'Showed' : 'No Show'}</span>
                      </Badge>
                      
                      <Badge 
                        variant={appointment.confirmed ? "default" : "outline"} 
                        className="flex items-center space-x-1 cursor-pointer"
                        onClick={() => toggleConfirmedStatus(appointment.id, appointment.confirmed)}
                      >
                        {appointment.confirmed ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>{appointment.confirmed ? 'Confirmed' : 'Unconfirmed'}</span>
                      </Badge>
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

export default AllAppointmentsManager;
