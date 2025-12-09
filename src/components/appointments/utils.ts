
import { AllAppointment } from './types';
import { formatDateInCentralTime, toCentralTime, getCTStartOfDayUTC } from '@/utils/dateTimeUtils';
import { format, startOfDay, endOfDay } from 'date-fns';

export const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Not set';
  return formatDateInCentralTime(dateString);
};

export const formatDateTime = (dateTimeString: string | null) => {
  if (!dateTimeString) return 'Not set';
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Invalid date';
  }
};

export const formatTime = (timeString: string | null) => {
  if (!timeString) return 'Not set';
  // Convert 24-hour format to 12-hour format with AM/PM
  const [hours, minutes] = timeString.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
};

export const isAppointmentInPast = (appointmentDate: string | null) => {
  if (!appointmentDate) return false;
  
  try {
    const todayStartCT_UTC = getCTStartOfDayUTC(new Date());
    const apptStartCT_UTC = getCTStartOfDayUTC(appointmentDate);

    if (!todayStartCT_UTC || !apptStartCT_UTC) return false;

    const isPast = apptStartCT_UTC.getTime() < todayStartCT_UTC.getTime();

    // Debug logging for ANY appointment on July 30 or 31, 2025
    if (appointmentDate.includes('2025-07-30') || appointmentDate.includes('2025-07-31')) {
      console.log('DEBUG: July 30/31 appointment date check:', {
        appointmentDate,
        apptStartCT_UTC: format(apptStartCT_UTC, 'yyyy-MM-dd HH:mm:ss'),
        todayStartCT_UTC: format(todayStartCT_UTC, 'yyyy-MM-dd HH:mm:ss'),
        isPast,
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
    const todayStartCT_UTC = getCTStartOfDayUTC(new Date());
    const apptStartCT_UTC = getCTStartOfDayUTC(appointmentDate);

    if (!todayStartCT_UTC || !apptStartCT_UTC) return false;

    return apptStartCT_UTC.getTime() >= todayStartCT_UTC.getTime();
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
  const completedStatuses = ['cancelled', 'canceled', 'no show', 'noshow', 'showed', 'oon'];
  
  return appointments.filter(appointment => {
    const normalizedStatus = appointment.status?.trim().toLowerCase();
    const isInPast = isAppointmentInPast(appointment.date_of_appointment);
    const isInFuture = isAppointmentInFuture(appointment.date_of_appointment);
    
    // Always move cancelled appointments to completed stage
    const isCompleted = appointment.status && completedStatuses.includes(normalizedStatus);
    
    switch (filterType) {
      case 'new':
        // New: Appointments where internal_process_complete is NOT true (false or null) - BUT NOT cancelled
        return !isCompleted && (appointment.internal_process_complete === false || appointment.internal_process_complete === null || appointment.internal_process_complete === undefined);
      case 'needs-review':
        // Needs Review: Past appointment OR NULL date + not updated (no status set or still "new") - BUT NOT cancelled
        return !isCompleted && (isInPast || !appointment.date_of_appointment) && (!appointment.status || appointment.status.trim() === '' || normalizedStatus === 'new');
      case 'future':
        // Future: appointment in the future + internal_process_complete is TRUE (two-point trigger) - BUT NOT cancelled
        return !isCompleted && isInFuture && appointment.internal_process_complete === true;
      case 'past':
        // Completed: Final status (Showed / No-show / Cancelled)
        return isCompleted;
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
      text: 'New',
      variant: 'secondary' as const
    };
  }
  if (appointment.status?.toLowerCase() === 'showed') {
    return {
      text: 'Showed',
      variant: 'showed' as const
    };
  } else {
    return {
      text: 'No Show',
      variant: 'noshow' as const
    };
  }
};

export const getStatusVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'showed':
      return 'showed' as const;
    case 'no show':
    case 'noshow':
      return 'noshow' as const;
    case 'cancelled':
    case 'canceled':
      return 'cancelled' as const;
    case 'confirmed':
      return 'confirmed' as const;
    case 'rescheduled':
      return 'rescheduled' as const;
    case 'oon':
      return 'oon' as const;
    case 'welcome call':
      return 'welcomeCall' as const;
    case 'scheduled':
    case 'new':
    case 'pending':
      return 'secondary' as const;
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

// Function to fetch actual status options from the database
export const getStatusOptions = async () => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('all_appointments')
      .select('status')
      .not('status', 'is', null)
      .neq('status', '');
    
    if (data) {
      const dbStatuses = data.map(item => item.status);
      // Filter to only include allowed statuses (case insensitive)
      const allowedStatuses = dbStatuses.filter(status => 
        statusOptions.some(allowed => allowed.toLowerCase() === status.toLowerCase())
      );
      
      // Create a map to deduplicate by lowercase version, keeping the predefined format
      const statusMap = new Map();
      
      // First add predefined statuses (these have the preferred capitalization)
      statusOptions.forEach(status => {
        statusMap.set(status.toLowerCase(), status);
      });
      
      // Then add any allowed database statuses that aren't already covered
      allowedStatuses.forEach(status => {
        const lowerStatus = status.toLowerCase();
        if (!statusMap.has(lowerStatus)) {
          statusMap.set(lowerStatus, status);
        }
      });
      
      return Array.from(statusMap.values()).sort();
    }
    // Return predefined options if no database data
    return statusOptions.sort();
  } catch (error) {
    console.error('Error fetching status options:', error);
    // Return predefined options on error
    return statusOptions.sort();
  }
};

// Function to get only base statuses for dropdown (no variations like "- Completed")
export const getBaseStatusOptions = async () => {
  // Only return the base predefined statuses for dropdown display
  return statusOptions.sort();
};

// Default status options - only these statuses are allowed
export const statusOptions = ['New', 'Pending', 'Confirmed', 'Scheduled', 'Showed', 'No Show', 'Cancelled', 'Rescheduled', 'Welcome Call', 'OON'];
