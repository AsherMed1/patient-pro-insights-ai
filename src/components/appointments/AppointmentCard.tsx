
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, User, Building, Phone, Mail, Clock } from 'lucide-react';
import { AllAppointment } from './types';
import { formatDate, formatTime, getAppointmentStatus, getProcedureOrderedVariant, statusOptions } from './utils';

interface AppointmentCardProps {
  appointment: AllAppointment;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
}

const AppointmentCard = ({ 
  appointment, 
  projectFilter, 
  onUpdateStatus, 
  onUpdateProcedure 
}: AppointmentCardProps) => {
  const appointmentStatus = getAppointmentStatus(appointment);

  return (
    <div className="border rounded-lg p-3 md:p-4 space-y-3 bg-white shadow-sm">
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
                  onValueChange={(value) => onUpdateStatus(appointment.id, value)}
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
                      onUpdateProcedure(appointment.id, value === 'yes');
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
};

export default AppointmentCard;
