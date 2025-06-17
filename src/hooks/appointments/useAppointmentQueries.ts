
import { supabase } from '@/integrations/supabase/client';

export const useAppointmentQueries = () => {
  const buildFilteredQuery = (filter: string | null, projectFilter?: string, isProjectPortal: boolean = false) => {
    let query = supabase
      .from('all_appointments')
      .select('*', { count: 'exact' })
      .order('date_of_appointment', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (projectFilter) {
      query = query.eq('project_name', projectFilter);
    }

    // For project portals, filter confirmed appointments at the database level
    if (isProjectPortal) {
      query = query.or('confirmed.eq.true,status.ilike.confirmed');
    }

    // Apply tab-specific filters
    if (filter) {
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      
      switch (filter) {
        case 'future':
          // Future appointments that are not cancelled
          query = query
            .gte('date_of_appointment', today)
            .not('status', 'ilike', 'cancelled');
          break;
        
        case 'past':
          // Past appointments that are not cancelled
          query = query
            .lt('date_of_appointment', today)
            .not('status', 'ilike', 'cancelled');
          break;
        
        case 'needs-review':
          // Past appointments that need review (no status or no procedure info) and not cancelled
          query = query
            .lt('date_of_appointment', today)
            .not('status', 'ilike', 'cancelled')
            .or('status.is.null,procedure_ordered.is.null');
          break;
        
        case 'cancelled':
          // All appointments with Cancelled status regardless of date
          query = query.ilike('status', 'cancelled');
          break;
      }
    }

    return query;
  };

  return {
    buildFilteredQuery
  };
};
