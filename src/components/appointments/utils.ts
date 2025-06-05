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
  // Only consider it updated if procedure_ordered is not null
  return appointment.procedure_ordered !== null;
};

export const filterAppointments = (appointments: AllAppointment[], filterType: string, isProjectPortal: boolean = false) => {
  return appointments.filter(appointment => {
    // For project portals, only show confirmed appointments (confirmed boolean OR status = 'Confirmed')
    if (isProjectPortal) {
      const isConfirmed = appointment.confirmed === true || 
                         (appointment.status && appointment.status.toLowerCase() === 'confirmed');
      if (!isConfirmed) {
        return false;
      }
    }

    switch (filterType) {
      case 'future':
        // Exclude cancelled appointments from future tab
        return isAppointmentInFuture(appointment.date_of_appointment) && 
               !isCancelledStatus(appointment.status);
      case 'past':
        // Include past appointments that are not cancelled
        return isAppointmentInPast(appointment.date_of_appointment) && 
               !isCancelledStatus(appointment.status);
      case 'needs-review':
        // Only show confirmed past appointments that need review (no status or no procedure info)
        return isAppointmentInPast(appointment.date_of_appointment) && 
               !isCancelledStatus(appointment.status) &&
               (!isStatusUpdated(appointment) || !isProcedureUpdated(appointment));
      case 'cancelled':
        // Show all appointments with Cancelled status regardless of date
        return isCancelledStatus(appointment.status);
      default:
        return true;
    }
  });
};

// Helper function to check if status indicates cancelled
const isCancelledStatus = (status: string | null) => {
  if (!status) return false;
  const normalizedStatus = status.toLowerCase().trim();
  return normalizedStatus === 'cancelled' || normalizedStatus === 'canceled';
};

export const getAppointmentStatus = (appointment: AllAppointment) => {
  // If appointment is in the past and was never confirmed, mark as No Show
  if (isAppointmentInPast(appointment.date_of_appointment) && !appointment.confirmed && !appointment.status) {
    return {
      text: 'No Show',
      variant: 'destructive' as const
    };
  }
  
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
