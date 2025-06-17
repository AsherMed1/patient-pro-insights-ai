
/**
 * Determines if an appointment is confirmed based on standardized criteria
 * An appointment is considered confirmed if:
 * - The confirmed boolean field is true, OR
 * - The status field is "Confirmed" (case-insensitive)
 */
export const isAppointmentConfirmed = (appointment: {
  confirmed?: boolean | null;
  status?: string | null;
}) => {
  return appointment.confirmed === true || 
         (appointment.status && appointment.status.toLowerCase() === 'confirmed');
};

/**
 * Filters appointments to only include confirmed ones
 */
export const filterConfirmedAppointments = (appointments: any[]) => {
  return appointments.filter(isAppointmentConfirmed);
};
