
import React from 'react';
import { Button } from "@/components/ui/button";
import { User, Building, Info } from 'lucide-react';
import { AllAppointment } from './types';
import { useLeadDetails } from './hooks/useLeadDetails';
import LeadDetailsModal from '@/components/LeadDetailsModal';
import ContactInfo from './components/ContactInfo';
import DateInfo from './components/DateInfo';
import StatusDisplay from './components/StatusDisplay';
import UpdateControls from './components/UpdateControls';

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
  const {
    showLeadDetails,
    setShowLeadDetails,
    leadData,
    loadingLeadData,
    handleViewDetails
  } = useLeadDetails();

  const onViewDetailsClick = () => {
    handleViewDetails(appointment.lead_name, appointment.project_name);
  };

  return (
    <>
      <div className="border rounded-lg p-3 md:p-4 space-y-3 bg-white shadow-sm">
        <div className="space-y-2">
          {/* Lead Name - Prominent on mobile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-base md:text-sm break-words">{appointment.lead_name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={onViewDetailsClick} disabled={loadingLeadData} className="ml-2 flex items-center space-x-1">
              <Info className="h-3 w-3" />
              <span className="hidden sm:inline">View Details</span>
            </Button>
          </div>
          
          {/* Project Name */}
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-600 break-words">{appointment.project_name}</span>
          </div>
          
          {/* Contact Info */}
          <ContactInfo 
            email={appointment.lead_email}
            phoneNumber={appointment.lead_phone_number}
          />
          
          {/* Date Info */}
          <DateInfo 
            dateAppointmentCreated={appointment.date_appointment_created}
            dateOfAppointment={appointment.date_of_appointment}
            requestedTime={appointment.requested_time}
          />
          
          {appointment.agent && (
            <div className="text-sm text-gray-600">
              Agent: {appointment.agent} {appointment.agent_number && `(${appointment.agent_number})`}
            </div>
          )}

          {/* Status Display */}
          <StatusDisplay status={appointment.status} />

          {/* Update Controls */}
          <UpdateControls 
            appointment={appointment}
            projectFilter={projectFilter}
            onUpdateStatus={onUpdateStatus}
            onUpdateProcedure={onUpdateProcedure}
          />
        </div>
      </div>

      <LeadDetailsModal isOpen={showLeadDetails} onClose={() => setShowLeadDetails(false)} lead={leadData} />
    </>
  );
};

export default AppointmentCard;
