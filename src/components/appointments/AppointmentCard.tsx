import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Building, Info, Calendar } from 'lucide-react';
import { AllAppointment } from './types';
import { useLeadDetails } from './hooks/useLeadDetails';
import LeadDetailsModal from '@/components/LeadDetailsModal';
import ContactInfo from './components/ContactInfo';
import DateInfo from './components/DateInfo';
import StatusDisplay from './components/StatusDisplay';
import UpdateControls from './components/UpdateControls';
import AppointmentNotes from './components/AppointmentNotes';
import AppointmentTags from './components/AppointmentTags';
import ColorIndicator from './components/ColorIndicator';

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

  const getCardBackgroundClass = () => {
    switch (appointment.color_indicator) {
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200';
      case 'green':
        return 'bg-green-50 border-green-200';
      case 'red':
        return 'bg-red-50 border-red-200';
      default:
        return '';
    }
  };

  return (
    <>
      <Card className={`p-4 space-y-4 hover:shadow-md transition-shadow ${getCardBackgroundClass()}`}>
        {/* Header with Name and Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <h3 className="font-semibold text-lg truncate">{appointment.lead_name}</h3>
              <ColorIndicator 
                appointmentId={appointment.id}
                initialColor={appointment.color_indicator}
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Building className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{appointment.project_name}</span>
              </div>
              
              {appointment.calendar_name && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{appointment.calendar_name}</span>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewDetailsClick} 
            disabled={loadingLeadData}
            className="flex-shrink-0"
          >
            <Info className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>

        {/* Contact and Date Information */}
        <div className="space-y-3">
          <ContactInfo 
            email={appointment.lead_email}
            phoneNumber={appointment.lead_phone_number}
          />
          
          <DateInfo 
            dateAppointmentCreated={appointment.date_appointment_created}
            dateOfAppointment={appointment.date_of_appointment}
            requestedTime={appointment.requested_time}
          />
          
          {appointment.agent && (
            <div className="text-sm text-muted-foreground">
              <strong>Agent:</strong> {appointment.agent} 
              {appointment.agent_number && ` (${appointment.agent_number})`}
            </div>
          )}
        </div>

        {/* Tags Section */}
        <AppointmentTags 
          appointmentId={appointment.id}
          projectName={appointment.project_name}
        />

        {/* Status Display */}
        <StatusDisplay status={appointment.status} />

        {/* Update Controls */}
        <UpdateControls 
          appointment={appointment}
          projectFilter={projectFilter}
          onUpdateStatus={onUpdateStatus}
          onUpdateProcedure={onUpdateProcedure}
        />

        {/* Notes Section */}
        <AppointmentNotes appointmentId={appointment.id} />
      </Card>

      <LeadDetailsModal 
        isOpen={showLeadDetails} 
        onClose={() => setShowLeadDetails(false)} 
        lead={leadData} 
      />
    </>
  );
};

export default AppointmentCard;
