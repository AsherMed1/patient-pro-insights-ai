
import { AllAppointment } from './types';
import { formatDateInCentralTime } from '@/utils/dateTimeUtils';
import { isAppointmentConfirmed } from '@/utils/appointmentUtils';

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
  today.setHours(0, 0, 0, 0); // Start of today
  const appointmentDay = new Date(appointmentDate);
  appointmentDay.setHours(0, 0, 0, 0); // Start of appointment day
  return appointmentDay < today;
};

export const isAppointmentInFuture = (appointmentDate: string | null) => {
  if (!appointmentDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const appointmentDay = new Date(appointmentDate);
  appointmentDay.setHours(0, 0, 0, 0); // Start of appointment day
  return appointmentDay >= today;
};

export const isStatusUpdated = (appointment: AllAppointment) => {
  return appointment.status && appointment.status.trim() !== '';
};

export const isProcedureUpdated = (appointment: AllAppointment) => {
  // After database migration: null means "not set", true/false means "explicitly set"
  return appointment.procedure_ordered !== null;
};

// Helper function to check if status indicates cancelled
const isCancelledStatus = (status: string | null) => {
  if (!status) return false;
  const normalizedStatus = status.toLowerCase().trim();
  return normalizedStatus === 'cancelled' || normalizedStatus === 'canceled';
};

export const filterAppointments = (appointments: AllAppointment[], filterType: string, isProjectPortal: boolean = false) => {
  console.log(`Filtering appointments - Type: ${filterType}, Total: ${appointments.length}, IsProjectPortal: ${isProjectPortal}`);
  
  return appointments.filter(appointment => {
    // For project portals, only show confirmed appointments (confirmed boolean OR status = 'Confirmed')
    if (isProjectPortal) {
      const isConfirmed = isAppointmentConfirmed(appointment);
      if (!isConfirmed) {
        console.log(`Filtered out non-confirmed appointment: ${appointment.lead_name}`);
        return false;
      }
    }

    const isPast = isAppointmentInPast(appointment.date_of_appointment);
    const isFuture = isAppointmentInFuture(appointment.date_of_appointment);
    const isCancelled = isCancelledStatus(appointment.status);
    const hasStatus = isStatusUpdated(appointment);
    const hasProcedure = isProcedureUpdated(appointment);

    console.log(`Appointment ${appointment.lead_name}: isPast=${isPast}, isFuture=${isFuture}, isCancelled=${isCancelled}, status=${appointment.status}`);

    switch (filterType) {
      case 'future':
        // Future appointments that are not cancelled
        const futureResult = isFuture && !isCancelled;
        console.log(`Future filter result for ${appointment.lead_name}: ${futureResult}`);
        return futureResult;
      
      case 'past':
        // Past appointments that are not cancelled
        const pastResult = isPast && !isCancelled;
        console.log(`Past filter result for ${appointment.lead_name}: ${pastResult}`);
        return pastResult;
      
      case 'needs-review':
        // Past appointments that need review (no status or no procedure info) and not cancelled
        const needsReviewResult = isPast && !isCancelled && (!hasStatus || !hasProcedure);
        console.log(`Needs review filter result for ${appointment.lead_name}: ${needsReviewResult} (hasStatus=${hasStatus}, hasProcedure=${hasProcedure})`);
        return needsReviewResult;
      
      case 'cancelled':
        // All appointments with Cancelled status regardless of date
        const cancelledResult = isCancelled;
        console.log(`Cancelled filter result for ${appointment.lead_name}: ${cancelledResult}`);
        return cancelledResult;
      
      default:
        return true;
    }
  });
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
