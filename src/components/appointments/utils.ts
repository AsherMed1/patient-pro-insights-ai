
import { AllAppointment } from './types';
import { formatDateInCentralTime, toCentralTime } from '@/utils/dateTimeUtils';
import { format, startOfDay, endOfDay } from 'date-fns';

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
  
  try {
    // Get current date in Central Time, start of day
    const nowCentral = toCentralTime(new Date());
    const todayStartCentral = nowCentral ? startOfDay(nowCentral) : startOfDay(new Date());
    
    // Convert appointment date to Central Time, start of day
    const appointmentCentral = toCentralTime(appointmentDate);
    const appointmentStartCentral = appointmentCentral ? startOfDay(appointmentCentral) : startOfDay(new Date(appointmentDate));
    
    const isPast = appointmentStartCentral < todayStartCentral;
    
    // Debug logging for ANY appointment on July 30 or 31, 2025
    if (appointmentDate.includes('2025-07-30') || appointmentDate.includes('2025-07-31')) {
      console.log('DEBUG: July 30/31 appointment date check:', {
        appointmentDate,
        appointmentStartCentral: format(appointmentStartCentral, 'yyyy-MM-dd HH:mm:ss'),
        todayStartCentral: format(todayStartCentral, 'yyyy-MM-dd HH:mm:ss'),
        isPast,
        todayFormatted: format(todayStartCentral, 'yyyy-MM-dd'),
        appointmentFormatted: format(appointmentStartCentral, 'yyyy-MM-dd'),
        currentTime: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        currentTimeCentral: nowCentral ? format(nowCentral, 'yyyy-MM-dd HH:mm:ss') : 'null'
      });
    }
    
    return isPast;
  } catch (error) {
    console.error('Error in isAppointmentInPast:', error);
    // Fallback to simple comparison
    const today = new Date();
    const appointmentDay = new Date(appointmentDate);
    return appointmentDay < today;
  }
};

export const isAppointmentInFuture = (appointmentDate: string | null) => {
  if (!appointmentDate) return false;
  
  try {
    // Get current date in Central Time, start of day
    const nowCentral = toCentralTime(new Date());
    const todayStartCentral = nowCentral ? startOfDay(nowCentral) : startOfDay(new Date());
    
    // Convert appointment date to Central Time, start of day  
    const appointmentCentral = toCentralTime(appointmentDate);
    const appointmentStartCentral = appointmentCentral ? startOfDay(appointmentCentral) : startOfDay(new Date(appointmentDate));
    
    return appointmentStartCentral >= todayStartCentral;
  } catch (error) {
    console.error('Error in isAppointmentInFuture:', error);
    // Fallback to simple comparison
    const today = new Date();
    const appointmentDay = new Date(appointmentDate);
    return appointmentDay >= today;
  }
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
    
    const isInPast = isAppointmentInPast(appointment.date_of_appointment);
    const isInFuture = isAppointmentInFuture(appointment.date_of_appointment);
    
    // Debug logging for Wendy Chavis case
    if (appointment.lead_name && appointment.lead_name.includes('Wendy')) {
      console.log('DEBUG: Wendy Chavis appointment filtering:', {
        lead_name: appointment.lead_name,
        date_of_appointment: appointment.date_of_appointment,
        status: appointment.status,
        procedure_ordered: appointment.procedure_ordered,
        filterType,
        isStatusComplete,
        isProcedureComplete,
        isBothComplete,
        isInPast,
        isInFuture
      });
    }
    
    switch (filterType) {
      case 'future':
        const futureResult = isInFuture && !isBothComplete;
        if (appointment.lead_name && appointment.lead_name.includes('Wendy')) {
          console.log('DEBUG: Wendy future filter result:', futureResult);
        }
        return futureResult;
      case 'past':
        return isBothComplete || 
               (isInPast && 
                appointment.status && 
                completedStatuses.includes(appointment.status));
      case 'needs-review':
        return !isBothComplete && 
               (isInPast && 
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
  switch (status?.toLowerCase()) {
    case 'showed':
    case 'won':
      return 'default' as const;
    case 'no show':
    case 'cancelled':
      return 'destructive' as const;
    case 'confirmed':
    case 'welcome call':
    case 'new':
      return 'secondary' as const;
    case 'rescheduled':
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

export const statusOptions = ['New', 'Showed', 'No Show', 'Cancelled', 'Rescheduled', 'Confirmed', 'Welcome Call', 'Won'];
