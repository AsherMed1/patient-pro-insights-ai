
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
  const completedStatuses = ['cancelled', 'no show', 'noshow', 'showed', 'won'];
  
  return appointments.filter(appointment => {
    const normalizedStatus = appointment.status?.trim().toLowerCase();
    const isInPast = isAppointmentInPast(appointment.date_of_appointment);
    const isInFuture = isAppointmentInFuture(appointment.date_of_appointment);
    
    switch (filterType) {
      case 'needs-review':
        // Needs Review: status = 'confirmed' AND date_of_appointment <= today
        return normalizedStatus === 'confirmed' && !isInFuture;
      case 'future':
        // Upcoming: status = 'confirmed' AND date_of_appointment > today
        return normalizedStatus === 'confirmed' && isInFuture;
      case 'past':
        // Completed: status IN ('cancelled', 'no show', 'noshow', 'showed', 'won') AND procedure_ordered IS NOT NULL
        const isCompletedStatus = appointment.status && 
          completedStatuses.includes(normalizedStatus);
        const hasProcedureDecision = appointment.procedure_ordered !== null && appointment.procedure_ordered !== undefined;
        return isCompletedStatus && hasProcedureDecision;
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
  if (appointment.status?.toLowerCase() === 'showed') {
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
      // Merge filtered database statuses with predefined options
      const allStatuses = [...new Set([...allowedStatuses, ...statusOptions])].sort();
      return allStatuses;
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
export const statusOptions = ['New', 'Confirmed', 'Showed', 'No Show', 'Cancelled', 'Rescheduled', 'Welcome Call', 'Won'];
