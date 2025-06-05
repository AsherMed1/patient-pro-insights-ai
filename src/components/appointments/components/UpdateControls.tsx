
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusOptions } from '../utils';
import { AllAppointment } from '../types';

interface UpdateControlsProps {
  appointment: AllAppointment;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
}

const UpdateControls = ({
  appointment,
  projectFilter,
  onUpdateStatus,
  onUpdateProcedure
}: UpdateControlsProps) => {
  if (!projectFilter) return null;

  // Check if status and procedure have been updated
  const isStatusUpdated = appointment.status && appointment.status.trim() !== '';
  const isProcedureUpdated = appointment.procedure_ordered !== null;

  // Get styling classes for dropdowns
  const getStatusTriggerClass = () => {
    const baseClass = "w-full h-11 md:h-10 text-base md:text-sm";
    if (isStatusUpdated) {
      return `${baseClass} bg-green-50 border-green-200 hover:bg-green-100`;
    } else {
      return `${baseClass} bg-red-50 border-red-200 hover:bg-red-100`;
    }
  };

  const getProcedureTriggerClass = () => {
    const baseClass = "w-full h-11 md:h-10 text-base md:text-sm";
    if (isProcedureUpdated) {
      return `${baseClass} bg-green-50 border-green-200 hover:bg-green-100`;
    } else {
      return `${baseClass} bg-red-50 border-red-200 hover:bg-red-100`;
    }
  };

  // Normalize status value to match dropdown options (case-insensitive)
  const getNormalizedStatusValue = () => {
    if (!appointment.status) return undefined;
    
    const normalizedStatus = statusOptions.find(
      option => option.toLowerCase() === appointment.status?.toLowerCase()
    );
    
    return normalizedStatus || appointment.status;
  };

  return (
    <div className="border-t pt-3 mt-3">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium block">Status:</label>
          <Select value={getNormalizedStatusValue()} onValueChange={value => onUpdateStatus(appointment.id, value)}>
            <SelectTrigger className={getStatusTriggerClass()}>
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
            value={appointment.procedure_ordered === null ? undefined : (appointment.procedure_ordered ? 'yes' : 'no')} 
            onValueChange={value => {
              if (value === 'yes' || value === 'no') {
                onUpdateProcedure(appointment.id, value === 'yes');
              }
            }}
          >
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
    </div>
  );
};

export default UpdateControls;
