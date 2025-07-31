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
import AppointmentNotes from './AppointmentNotes';
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
  
  contact_id?: string;
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
  email?: string;
  patient_intake_notes?: string;
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

  // Check if status has been updated (primary indicator)
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
      let leadRecord: NewLead | null = null;

      // Strategy 1: Match by lead_name and project_name (most specific)
      if (appointment.lead_name && appointment.project_name) {
        console.log('Trying strategy 1: name + project');
        const {
          data: nameProjectResults,
          error: nameProjectError
        } = await supabase.from('new_leads').select('*').eq('lead_name', appointment.lead_name).eq('project_name', appointment.project_name).order('created_at', {
          ascending: false
        }).limit(1);
        if (!nameProjectError && nameProjectResults && nameProjectResults.length > 0) {
          leadRecord = nameProjectResults[0];
          console.log('Found lead by name + project');
        }
      }

      // Strategy 2: If no results, try phone number matching
      if (!leadRecord && appointment.lead_phone_number) {
        console.log('Trying strategy 2: phone number');
        const {
          data: phoneResults,
          error: phoneError
        } = await supabase.from('new_leads').select('*').eq('phone_number', appointment.lead_phone_number).order('created_at', {
          ascending: false
        }).limit(1);
        if (!phoneError && phoneResults && phoneResults.length > 0) {
          leadRecord = phoneResults[0];
          console.log('Found lead by phone number');
        }
      }

      // Strategy 3: If no results, try email matching
      if (!leadRecord && appointment.lead_email) {
        console.log('Trying strategy 3: email');
        const {
          data: emailResults,
          error: emailError
        } = await supabase.from('new_leads').select('*').eq('email', appointment.lead_email).order('created_at', {
          ascending: false
        }).limit(1);
        if (!emailError && emailResults && emailResults.length > 0) {
          leadRecord = emailResults[0];
          console.log('Found lead by email');
        }
      }

      // Strategy 4: If no results, try GHL ID matching (ghl_id in appointments maps to contact_id in leads)
      if (!leadRecord && appointment.ghl_id) {
        console.log('Trying strategy 4: GHL ID');
        const {
          data: ghlResults,
          error: ghlError
        } = await supabase.from('new_leads').select('*').eq('contact_id', appointment.ghl_id).order('created_at', {
          ascending: false
        }).limit(1);
        if (!ghlError && ghlResults && ghlResults.length > 0) {
          leadRecord = ghlResults[0];
          console.log('Found lead by GHL ID');
        }
      }

      // Strategy 5: If still no results, try case-insensitive name search as fallback
      if (!leadRecord && appointment.lead_name) {
        console.log('Trying strategy 5: case-insensitive name search');
        const {
          data: ilikResults,
          error: ilikError
        } = await supabase.from('new_leads').select('*').ilike('lead_name', appointment.lead_name).eq('project_name', appointment.project_name).order('created_at', {
          ascending: false
        }).limit(1);
        if (!ilikError && ilikResults && ilikResults.length > 0) {
          leadRecord = ilikResults[0];
          console.log('Found lead by case-insensitive name search');
        }
      }
      if (leadRecord) {
        setLeadData(leadRecord);
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

          {/* Patient Intake Notes */}
          {appointment.patient_intake_notes && <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Patient Intake Notes:</span>
              <div className="bg-blue-50 p-2 rounded-md border-l-4 border-blue-400">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.patient_intake_notes}</p>
              </div>
            </div>}


          {/* Internal Notes */}
          <div className="space-y-2">
            <AppointmentNotes appointmentId={appointment.id} leadName={appointment.lead_name} projectName={appointment.project_name} />
          </div>

          {/* Status and Procedure Badges - Responsive layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
            
            
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