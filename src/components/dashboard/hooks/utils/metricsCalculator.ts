
import { isAppointmentConfirmed } from '@/utils/appointmentUtils';

export const calculateShowsAndNoShows = (appointments: any[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Only count appointments that have occurred (past appointment date)
  const pastAppointments = appointments.filter(apt => {
    if (!apt.date_of_appointment) return false;
    const appointmentDate = new Date(apt.date_of_appointment);
    appointmentDate.setHours(0, 0, 0, 0);
    return appointmentDate < today;
  });

  console.log(`Past appointments for shows/no-shows calculation: ${pastAppointments.length}`);

  // Shows: appointments that actually showed up (status = 'Showed' OR showed = true)
  const shows = pastAppointments.filter(apt => 
    apt.status === 'Showed' || apt.showed === true
  ).length;

  // No Shows: past appointments that didn't show and weren't cancelled
  const noShows = pastAppointments.filter(apt => 
    (apt.status === 'No Show' || (apt.showed === false && apt.status !== 'Cancelled')) &&
    apt.status !== 'Showed' && apt.showed !== true
  ).length;

  console.log(`Shows: ${shows}, No Shows: ${noShows}`);
  
  return { shows, noShows };
};

export const calculateCallMetrics = (calls: any[]) => {
  const outboundDials = calls.filter(call => call.direction === 'outbound').length;
  const pickups40Plus = calls.filter(call => 
    call.status === 'completed' && call.duration_seconds >= 40
  ).length;
  const conversations2Plus = calls.filter(call => call.duration_seconds >= 120).length;

  return { outboundDials, pickups40Plus, conversations2Plus };
};

export const calculateAdSpend = (adSpendData: any[]) => {
  return adSpendData.reduce((sum, record) => {
    const spendValue = typeof record.spend === 'string' ? parseFloat(record.spend) : Number(record.spend);
    return sum + (isNaN(spendValue) ? 0 : spendValue);
  }, 0);
};

export const calculateAppointmentMetrics = (appointments: any[]) => {
  const bookedAppointments = appointments.length;
  const confirmedAppointments = appointments.filter(isAppointmentConfirmed).length;
  const unconfirmedAppointments = bookedAppointments - confirmedAppointments;
  
  // For appointments to take place, we need to check the actual appointment date in the future
  const appointmentsToTakePlace = appointments.filter(apt => 
    apt.date_of_appointment && new Date(apt.date_of_appointment) >= new Date()
  ).length;

  return {
    bookedAppointments,
    confirmedAppointments,
    unconfirmedAppointments,
    appointmentsToTakePlace
  };
};
