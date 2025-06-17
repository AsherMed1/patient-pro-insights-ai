
import { supabase } from '@/integrations/supabase/client';
import { AllAppointment } from '@/components/appointments/types';

export const useAppointmentCounts = () => {
  const fetchAllAppointmentsForCounting = async (projectFilter?: string, isProjectPortal: boolean = false) => {
    try {
      let allRecords: AllAppointment[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      // Build base query
      let baseQuery = supabase.from('all_appointments').select('*');
      
      if (projectFilter) {
        baseQuery = baseQuery.eq('project_name', projectFilter);
      }

      // For project portals, filter confirmed appointments
      if (isProjectPortal) {
        baseQuery = baseQuery.or('confirmed.eq.true,status.ilike.confirmed');
      }

      // Fetch all records in batches without any limit
      while (hasMore) {
        const { data, error } = await baseQuery
          .range(from, from + batchSize - 1)
          .order('date_of_appointment', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allRecords = [...allRecords, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
          console.log(`Fetched appointments batch: ${data.length} records, total so far: ${allRecords.length}`);
        } else {
          hasMore = false;
        }
      }

      console.log(`Total appointments fetched for counting: ${allRecords.length}`);
      return allRecords;
    } catch (error) {
      console.error('Error fetching all appointments for counting:', error);
      return [];
    }
  };

  const calculateTotalCounts = async (projectFilter?: string, isProjectPortal: boolean = false) => {
    try {
      const allAppointments = await fetchAllAppointmentsForCounting(projectFilter, isProjectPortal);
      
      // Calculate counts using the same logic as the filter functions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const counts = {
        all: allAppointments.length,
        future: 0,
        past: 0,
        needsReview: 0,
        cancelled: 0
      };

      allAppointments.forEach(appointment => {
        const appointmentDate = appointment.date_of_appointment ? new Date(appointment.date_of_appointment) : null;
        if (appointmentDate) {
          appointmentDate.setHours(0, 0, 0, 0);
        }
        
        const isPast = appointmentDate ? appointmentDate < today : false;
        const isFuture = appointmentDate ? appointmentDate >= today : false;
        const isCancelled = appointment.status && appointment.status.toLowerCase().trim() === 'cancelled';
        const hasStatus = appointment.status && appointment.status.trim() !== '';
        const hasProcedure = appointment.procedure_ordered !== null;

        if (isCancelled) {
          counts.cancelled++;
        } else if (isFuture) {
          counts.future++;
        } else if (isPast) {
          counts.past++;
          if (!hasStatus || !hasProcedure) {
            counts.needsReview++;
          }
        }
      });

      console.log('Total counts calculated:', counts);
      return counts;
    } catch (error) {
      console.error('Error fetching total counts:', error);
      return {
        all: 0,
        future: 0,
        past: 0,
        needsReview: 0,
        cancelled: 0
      };
    }
  };

  return {
    calculateTotalCounts
  };
};
