
import { AllAppointment } from './types';
import { formatDateInCentralTime } from '@/utils/dateTimeUtils';

export const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Not set';
  return formatDateInCentralTime(dateString);
};

export const formatTime = (timeString: string | null) => {
  if (!timeString) return 'Not set';
  return timeString;
};

export const isAppointmentInPast = (appointmentDate: string | null) => {
  if (!appointmentDate) return false;
  const today = new Date();
  const appointmentDay = new Date(appointmentDate);
  return appointmentDay < today;
};

export const isAppointmentInFuture = (appointmentDate: string | null) => {
  if (!appointmentDate) return false;
  const today = new Date();
  const appointmentDay = new Date(appointmentDate);
  return appointmentDay >= today;
};

export const isStatusUpdated = (appointment: AllAppointment) => {
  return appointment.status && appointment.status.trim() !== '';
};

export const isProcedureUpdated = (appointment: AllAppointment) => {
  return appointment.procedure_ordered !== null && appointment.procedure_ordered !== undefined;
};

export const filterAppointments = (appointments: AllAppointment[], filterType: string) => {
  const completedStatuses = ['Cancelled', 'No Show', 'Won', 'Lost'];
  
  return appointments.filter(appointment => {
    // Check if both status and procedure_ordered are completed
    const isStatusComplete = appointment.status && appointment.status.trim() !== '';
    const isProcedureComplete = appointment.procedure_ordered !== null && appointment.procedure_ordered !== undefined;
    const isBothComplete = isStatusComplete && isProcedureComplete;
    
    switch (filterType) {
      case 'future':
        return isAppointmentInFuture(appointment.date_of_appointment) && !isBothComplete;
      case 'past':
        return isBothComplete || 
               (isAppointmentInPast(appointment.date_of_appointment) && 
                appointment.status && 
                completedStatuses.includes(appointment.status));
      case 'needs-review':
        return !isBothComplete && 
               (isAppointmentInPast(appointment.date_of_appointment) && 
                (!appointment.status || !completedStatuses.includes(appointment.status)));
      default:
        return true;
    }
  });
};

export const getAppointmentStatus = (appointment: AllAppointment) => {
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

export const getStatusVariant = (status: string) => {
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

export const getProcedureOrderedVariant = (procedureOrdered: boolean | null) => {
  if (procedureOrdered === true) {
    return 'default' as const;
  } else if (procedureOrdered === false) {
    return 'destructive' as const;
  }
  return 'secondary' as const;
};

export const statusOptions = ['Showed', 'No Show', 'Cancelled', 'Rescheduled', 'Confirmed', 'Welcome Call', 'Won'];
