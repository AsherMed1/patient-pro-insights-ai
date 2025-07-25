import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, User, Building, Phone, Mail, Clock, Info } from 'lucide-react';
import { AllAppointment } from './types';
import { formatDate, formatTime, getAppointmentStatus, getProcedureOrderedVariant, statusOptions } from './utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import LeadDetailsModal from '@/components/LeadDetailsModal';
interface AppointmentCardProps {
  appointment: AllAppointment;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
}
interface NewLead {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  times_called: number;
  created_at: string;
  updated_at: string;
  actual_calls_count?: number;
  appt_date?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  status?: string;
  procedure_ordered?: boolean;
  phone_number?: string;
  calendar_location?: string;
  insurance_provider?: string;
  insurance_id?: string;
  insurance_plan?: string;
  group_number?: string;
  address?: string;
  notes?: string;
  card_image?: string;
  knee_pain_duration?: string;
  knee_osteoarthritis_diagnosis?: boolean;
  gae_candidate?: boolean;
  trauma_injury_onset?: boolean;
  pain_severity_scale?: number;
  symptoms_description?: string;
  knee_treatments_tried?: string;
  fever_chills?: boolean;
  knee_imaging?: boolean;
  heel_morning_pain?: boolean;
  heel_pain_improves_rest?: boolean;
  heel_pain_duration?: string;
  heel_pain_exercise_frequency?: string;
  plantar_fasciitis_treatments?: string;
  plantar_fasciitis_mobility_impact?: boolean;
  plantar_fasciitis_imaging?: boolean;
  email?: string;
}
const AppointmentCard = ({
  appointment,
  projectFilter,
  onUpdateStatus,
  onUpdateProcedure
}: AppointmentCardProps) => {
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [leadData, setLeadData] = useState<NewLead | null>(null);
  const [loadingLeadData, setLoadingLeadData] = useState(false);
  const {
    toast
  } = useToast();
  const appointmentStatus = getAppointmentStatus(appointment);

  // Check if status and procedure have been updated
  const isStatusUpdated = appointment.status && appointment.status.trim() !== '';
  const isProcedureUpdated = appointment.procedure_ordered !== null && appointment.procedure_ordered !== undefined;

  // Get styling classes for dropdowns
  const getStatusTriggerClass = () => {
    if (!projectFilter) return "w-full h-11 md:h-10 text-base md:text-sm";
    const baseClass = "w-full h-11 md:h-10 text-base md:text-sm";
    if (isStatusUpdated) {
      return `${baseClass} bg-green-50 border-green-200 hover:bg-green-100`;
    } else {
      return `${baseClass} bg-red-50 border-red-200 hover:bg-red-100`;
    }
  };
  const getProcedureTriggerClass = () => {
    if (!projectFilter) return "w-full h-11 md:h-10 text-base md:text-sm";
    const baseClass = "w-full h-11 md:h-10 text-base md:text-sm";
    if (isProcedureUpdated) {
      return `${baseClass} bg-green-50 border-green-200 hover:bg-green-100`;
    } else {
      return `${baseClass} bg-red-50 border-red-200 hover:bg-red-100`;
    }
  };
  const handleViewDetails = async () => {
    try {
      setLoadingLeadData(true);

      // Try to find the lead by exact name match first
      let {
        data,
        error
      } = await supabase.from('new_leads').select('*').eq('lead_name', appointment.lead_name).eq('project_name', appointment.project_name).maybeSingle();
      if (error) throw error;

      // If no exact match, try case-insensitive search
      if (!data) {
        const {
          data: altData,
          error: altError
        } = await supabase.from('new_leads').select('*').ilike('lead_name', appointment.lead_name).eq('project_name', appointment.project_name).maybeSingle();
        if (altError) throw altError;
        data = altData;
      }
      if (data) {
        setLeadData(data);
        setShowLeadDetails(true);
      } else {
        toast({
          title: "No Additional Details",
          description: "No additional lead information found for this appointment.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error fetching lead details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lead details",
        variant: "destructive"
      });
    } finally {
      setLoadingLeadData(false);
    }
  };
  return <>
      <div className="border rounded-lg p-3 md:p-4 space-y-3 bg-white shadow-sm">
        <div className="space-y-2">
          {/* Lead Name - Prominent on mobile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-base md:text-sm break-words">{appointment.lead_name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleViewDetails} disabled={loadingLeadData} className="ml-2 flex items-center space-x-1">
              <Info className="h-3 w-3" />
              <span className="hidden sm:inline">View Details</span>
            </Button>
          </div>
          
          {/* Project Name */}
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-600 break-words">{appointment.project_name}</span>
          </div>
          
          {/* Contact Info - Stacked on mobile */}
          {appointment.lead_email && <div className="flex items-start space-x-2">
              <Mail className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600 break-all">{appointment.lead_email}</span>
            </div>}
          
          {appointment.lead_phone_number && <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">{appointment.lead_phone_number}</span>
            </div>}
          
          {/* Date Info - More compact on mobile */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Created: {formatDate(appointment.date_appointment_created)}
              </span>
            </div>
            
            {appointment.date_of_appointment && <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  Appointment: {formatDate(appointment.date_of_appointment)}
                </span>
              </div>}
            
            {appointment.requested_time && <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  Time: {formatTime(appointment.requested_time)}
                </span>
              </div>}
          </div>
          
          {appointment.agent && <div className="text-sm text-gray-600">
              Agent: {appointment.agent} {appointment.agent_number && `(${appointment.agent_number})`}
            </div>}

          {/* Status and Procedure Badges - Responsive layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
            <Badge variant={appointmentStatus.variant} className="text-xs w-fit">
              {appointmentStatus.text}
            </Badge>
            
          </div>

          {/* Status Update Section - Better mobile layout */}
          {projectFilter && <div className="border-t pt-3 mt-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Status:</label>
                  <Select value={appointment.status && appointment.status.trim() !== '' ? statusOptions.find(option => option.toLowerCase() === appointment.status.toLowerCase()) || appointment.status : undefined} onValueChange={value => onUpdateStatus(appointment.id, value)}>
                    <SelectTrigger className={getStatusTriggerClass()}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg z-50">
                      {statusOptions.map(status => <SelectItem key={status} value={status} className="text-base md:text-sm py-3 md:py-2">
                          {status}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block">Procedure Ordered:</label>
                  <Select value={isProcedureUpdated ? appointment.procedure_ordered === true ? 'yes' : 'no' : ''} onValueChange={value => {
                if (value === 'yes' || value === 'no') {
                  onUpdateProcedure(appointment.id, value === 'yes');
                }
              }}>
                    <SelectTrigger className={getProcedureTriggerClass()}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes" className="text-base md:text-sm py-3 md:py-2">Yes</SelectItem>
                      <SelectItem value="no" className="text-base md:text-sm py-3 md:py-2">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>}
        </div>
      </div>

      <LeadDetailsModal isOpen={showLeadDetails} onClose={() => setShowLeadDetails(false)} lead={leadData} />
    </>;
};
export default AppointmentCard;