
import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { formatDate, formatTime } from '../utils';

interface DateInfoProps {
  dateAppointmentCreated: string | null;
  dateOfAppointment: string | null;
  requestedTime: string | null;
}

const DateInfo = ({ dateAppointmentCreated, dateOfAppointment, requestedTime }: DateInfoProps) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
        <span className="text-sm text-gray-600">
          Created: {formatDate(dateAppointmentCreated)}
        </span>
      </div>
      
      {dateOfAppointment && (
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm text-gray-600">
            Appointment: {formatDate(dateOfAppointment)}
          </span>
        </div>
      )}
      
      {requestedTime && (
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm text-gray-600">
            Time: {formatTime(requestedTime)}
          </span>
        </div>
      )}
    </div>
  );
};

export default DateInfo;
