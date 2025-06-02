import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { Calendar, User, Building, Phone, Mail, Clock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { formatDateInCentralTime, formatTimeInCentralTime } from '@/utils/dateTimeUtils';

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

interface AllAppointmentsManagerProps {
  projectFilter?: string;
}

const AllAppointmentsManager = ({ projectFilter }: AllAppointmentsManagerProps) => {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();
  }, [projectFilter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      let appointmentsQuery = supabase
        .from('all_appointments')
        .select('*')
        .order('date_appointment_created', { ascending: false });
      
      if (projectFilter) {
        appointmentsQuery = appointmentsQuery.eq('project_name', projectFilter);
      }
      
      const { data, error } = await appointmentsQuery;
      
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return formatDateInCentralTime(dateString);
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'Not set';
    return timeString;
  };

  const isAppointmentPassed = (appointmentDate: string | null) => {
    if (!appointmentDate) return false;
    const today = new Date();
    const appointmentDay = new Date(appointmentDate);
    return appointmentDay < today;
  };

  const getAppointmentStatus = (appointment: AllAppointment) => {
    if (!appointment.date_of_appointment) {
      return { text: 'Date Not Set', variant: 'secondary' as const };
    }

    if (!isAppointmentPassed(appointment.date_of_appointment)) {
      return { text: 'Pending', variant: 'outline' as const };
    }

    if (appointment.showed) {
      return { text: 'Showed', variant: 'default' as const };
    } else {
      return { text: 'No Show', variant: 'destructive' as const };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {projectFilter ? `${projectFilter} - All Appointments` : 'All Appointments'}
        </CardTitle>
        <CardDescription>
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} recorded (Times in Central Time Zone)
          {projectFilter && ` for ${projectFilter}`}
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
            {appointments.map((appointment) => {
              const appointmentStatus = getAppointmentStatus(appointment);
              
              return (
                <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{appointment.lead_name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{appointment.project_name}</span>
                      </div>
                      
                      {appointment.lead_email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{appointment.lead_email}</span>
                        </div>
                      )}
                      
                      {appointment.lead_phone_number && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{appointment.lead_phone_number}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Created: {formatDate(appointment.date_appointment_created)}
                        </span>
                      </div>
                      
                      {appointment.date_of_appointment && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            Appointment: {formatDate(appointment.date_of_appointment)}
                          </span>
                        </div>
                      )}
                      
                      {appointment.requested_time && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            Time: {formatTime(appointment.requested_time)}
                          </span>
                        </div>
                      )}
                      
                      {appointment.agent && (
                        <div className="text-sm text-gray-600">
                          Agent: {appointment.agent} {appointment.agent_number && `(${appointment.agent_number})`}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <Badge variant={appointment.confirmed ? "default" : "secondary"}>
                        {appointment.confirmed ? "Confirmed" : "Not Confirmed"}
                      </Badge>
                      <Badge variant={appointmentStatus.variant}>
                        {appointmentStatus.text}
                      </Badge>
                      {appointment.stage_booked && (
                        <Badge variant="outline">
                          {appointment.stage_booked}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AllAppointmentsManager;
