
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { AllAppointment, AllAppointmentsManagerProps } from './appointments/types';
import AppointmentsTabs from './appointments/AppointmentsTabs';

const AllAppointmentsManager = ({
  projectFilter
}: AllAppointmentsManagerProps) => {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("needs-review");
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
        <AppointmentsTabs
          appointments={appointments}
          loading={loading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectFilter={projectFilter}
          onUpdateStatus={updateAppointmentStatus}
          onUpdateProcedure={updateProcedureOrdered}
        />
      </CardContent>
    </Card>
  );
};

export default AllAppointmentsManager;
