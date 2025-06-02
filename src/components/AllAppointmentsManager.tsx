import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, User, Building, Phone, Mail, Clock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { formatDateInCentralTime, formatTimeInCentralTime } from '@/utils/dateTimeUtils';
import { useIsMobile } from "@/hooks/use-mobile";

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
  status?: string;
  procedure_ordered?: boolean;
}

interface AllAppointmentsManagerProps {
  projectFilter?: string;
}

const AllAppointmentsManager = ({
  projectFilter
}: AllAppointmentsManagerProps) => {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("needs-review");
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          status,
          showed: status === 'Showed' ? true : status === 'No Show' ? false : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? {
              ...appointment,
              status,
              showed: status === 'Showed' ? true : status === 'No Show' ? false : null
            }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Appointment status updated successfully"
      });
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    }
  };

  const updateProcedureOrdered = async (appointmentId: string, procedureOrdered: boolean) => {
    try {
      const { error } = await supabase
        .from('all_appointments')
        .update({
          procedure_ordered: procedureOrdered,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev => prev.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, procedure_ordered: procedureOrdered }
          : appointment
      ));

      toast({
        title: "Success",
        description: "Procedure information updated successfully"
      });
    } catch (error) {
      console.error('Error updating procedure information:', error);
      toast({
        title: "Error",
        description: "Failed to update procedure information",
        variant: "destructive"
      });
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

  const isAppointmentInPast = (appointmentDate: string | null) => {
    if (!appointmentDate) return false;
    const today = new Date();
    const appointmentDay = new Date(appointmentDate);
    return appointmentDay < today;
  };

  const isAppointmentInFuture = (appointmentDate: string | null) => {
    if (!appointmentDate) return false;
    const today = new Date();
    const appointmentDay = new Date(appointmentDate);
    return appointmentDay >= today;
  };

  const isStatusUpdated = (appointment: AllAppointment) => {
    return appointment.status && appointment.status.trim() !== '';
  };

  const isProcedureUpdated = (appointment: AllAppointment) => {
    return appointment.procedure_ordered !== null && appointment.procedure_ordered !== undefined;
  };

  const filterAppointments = (filterType: string) => {
    return appointments.filter(appointment => {
      switch (filterType) {
        case 'future':
          return isAppointmentInFuture(appointment.date_of_appointment);
        case 'past':
          return isAppointmentInPast(appointment.date_of_appointment) && 
                 isStatusUpdated(appointment) && 
                 isProcedureUpdated(appointment);
        case 'needs-review':
          return isAppointmentInPast(appointment.date_of_appointment) && 
                 (!isStatusUpdated(appointment) || !isProcedureUpdated(appointment));
        default:
          return true;
      }
    });
  };

  const getAppointmentStatus = (appointment: AllAppointment) => {
    if (appointment.status) {
      return {
        text: appointment.status,
        variant: getStatusVariant(appointment.status)
      };
    }
    if (!appointment.date_of_appointment) {
      return {
        text: 'Date Not Set',
        variant: 'secondary' as const
      };
    }
    if (!isAppointmentInPast(appointment.date_of_appointment)) {
      return {
        text: 'Pending',
        variant: 'outline' as const
      };
    }
    if (appointment.showed) {
      return {
        text: 'Showed',
        variant: 'default' as const
      };
    } else {
      return {
        text: 'No Show',
        variant: 'destructive' as const
      };
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Showed':
      case 'Won':
        return 'default' as const;
      case 'No Show':
      case 'Cancelled':
        return 'destructive' as const;
      case 'Confirmed':
      case 'Welcome Call':
        return 'secondary' as const;
      case 'Rescheduled':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  const getProcedureOrderedVariant = (procedureOrdered: boolean | null) => {
    if (procedureOrdered === true) {
      return 'default' as const;
    } else if (procedureOrdered === false) {
      return 'destructive' as const;
    }
    return 'secondary' as const;
  };

  const statusOptions = ['Showed', 'No Show', 'Cancelled', 'Rescheduled', 'Confirmed', 'Welcome Call', 'Won'];

  const renderAppointmentsList = (filteredAppointments: AllAppointment[]) => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading appointments...</div>
        </div>
      );
    }

    if (filteredAppointments.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500">No appointments found for this category</div>
        </div>
      );
    }

    return (
      <div className="space-y-3 md:space-y-4">
        {filteredAppointments.map(appointment => {
          const appointmentStatus = getAppointmentStatus(appointment);
          return (
            <div key={appointment.id} className="border rounded-lg p-3 md:p-4 space-y-3 bg-white shadow-sm">
              <div className="space-y-2">
                {/* Lead Name - Prominent on mobile */}
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="font-medium text-base md:text-sm break-words">{appointment.lead_name}</span>
                </div>
                
                {/* Project Name */}
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 break-words">{appointment.project_name}</span>
                </div>
                
                {/* Contact Info - Stacked on mobile */}
                {appointment.lead_email && (
                  <div className="flex items-start space-x-2">
                    <Mail className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600 break-all">{appointment.lead_email}</span>
                  </div>
                )}
                
                {appointment.lead_phone_number && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{appointment.lead_phone_number}</span>
                  </div>
                )}
                
                {/* Date Info - More compact on mobile */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">
                      Created: {formatDate(appointment.date_appointment_created)}
                    </span>
                  </div>
                  
                  {appointment.date_of_appointment && (
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">
                        Appointment: {formatDate(appointment.date_of_appointment)}
                      </span>
                    </div>
                  )}
                  
                  {appointment.requested_time && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">
                        Time: {formatTime(appointment.requested_time)}
                      </span>
                    </div>
                  )}
                </div>
                
                {appointment.agent && (
                  <div className="text-sm text-gray-600">
                    Agent: {appointment.agent} {appointment.agent_number && `(${appointment.agent_number})`}
                  </div>
                )}

                {/* Status and Procedure Badges - Responsive layout */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
                  <Badge variant={appointmentStatus.variant} className="text-xs w-fit">
                    {appointmentStatus.text}
                  </Badge>
                  <Badge variant={getProcedureOrderedVariant(appointment.procedure_ordered)} className="text-xs w-fit">
                    Procedure: {appointment.procedure_ordered === true ? 'Yes' : appointment.procedure_ordered === false ? 'No' : 'Not Set'}
                  </Badge>
                </div>

                {/* Status Update Section - Better mobile layout */}
                {projectFilter && (
                  <div className="border-t pt-3 mt-3">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium block">Status:</label>
                        <Select 
                          value={appointment.status || ''} 
                          onValueChange={(value) => updateAppointmentStatus(appointment.id, value)}
                        >
                          <SelectTrigger className="w-full h-11 md:h-10 text-base md:text-sm">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(status => (
                              <SelectItem key={status} value={status} className="text-base md:text-sm py-3 md:py-2">
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium block">Procedure Ordered:</label>
                        <Select 
                          value={appointment.procedure_ordered === true ? 'yes' : appointment.procedure_ordered === false ? 'no' : ''} 
                          onValueChange={(value) => {
                            if (value === 'yes' || value === 'no') {
                              updateProcedureOrdered(appointment.id, value === 'yes');
                            }
                          }}
                        >
                          <SelectTrigger className="w-full h-11 md:h-10 text-base md:text-sm">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes" className="text-base md:text-sm py-3 md:py-2">Yes</SelectItem>
                            <SelectItem value="no" className="text-base md:text-sm py-3 md:py-2">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const futureAppointments = filterAppointments('future');
  const pastAppointments = filterAppointments('past');
  const needsReviewAppointments = filterAppointments('needs-review');

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 md:pb-6">
        <CardTitle className="text-lg md:text-xl">
          {projectFilter ? `${projectFilter} - All Appointments` : 'All Appointments'}
        </CardTitle>
        <CardDescription className="text-sm">
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} recorded (Times in Central Time Zone)
          {projectFilter && ` for ${projectFilter}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 h-auto p-1' : 'grid-cols-3'}`}>
            <TabsTrigger 
              value="needs-review" 
              className={`${isMobile ? 'w-full mb-1 py-3 text-sm' : 'text-xs md:text-sm'}`}
            >
              Needs Review ({needsReviewAppointments.length})
            </TabsTrigger>
            <TabsTrigger 
              value="future" 
              className={`${isMobile ? 'w-full mb-1 py-3 text-sm' : 'text-xs md:text-sm'}`}
            >
              Future ({futureAppointments.length})
            </TabsTrigger>
            <TabsTrigger 
              value="past" 
              className={`${isMobile ? 'w-full py-3 text-sm' : 'text-xs md:text-sm'}`}
            >
              Past ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="needs-review" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
            {renderAppointmentsList(needsReviewAppointments)}
          </TabsContent>

          <TabsContent value="future" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
            {renderAppointmentsList(futureAppointments)}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
            {renderAppointmentsList(pastAppointments)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AllAppointmentsManager;
