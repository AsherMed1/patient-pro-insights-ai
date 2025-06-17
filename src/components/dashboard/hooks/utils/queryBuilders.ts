
import { supabase } from '@/integrations/supabase/client';
import type { DateRange } from '../../types';

export const buildLeadsQuery = (selectedProject: string, dateRange: DateRange) => {
  let query = supabase.from('new_leads').select('*');
  if (selectedProject !== 'ALL') {
    query = query.eq('project_name', selectedProject);
  }
  if (dateRange.from) {
    const fromDate = dateRange.from.toISOString().split('T')[0];
    query = query.gte('date', fromDate);
  }
  if (dateRange.to) {
    const toDate = dateRange.to.toISOString().split('T')[0];
    query = query.lte('date', toDate);
  }
  return query;
};

export const buildAppointmentsQuery = (selectedProject: string, dateRange: DateRange) => {
  let query = supabase.from('all_appointments').select('*');
  if (selectedProject !== 'ALL') {
    query = query.eq('project_name', selectedProject);
  }
  if (dateRange.from) {
    const fromDate = dateRange.from.toISOString().split('T')[0];
    query = query.gte('date_appointment_created', fromDate);
  }
  if (dateRange.to) {
    const toDate = dateRange.to.toISOString().split('T')[0];
    query = query.lte('date_appointment_created', toDate);
  }
  return query;
};

export const buildCallsQuery = (selectedProject: string, dateRange: DateRange) => {
  let query = supabase.from('all_calls').select('*');
  if (selectedProject !== 'ALL') {
    query = query.eq('project_name', selectedProject);
  }
  if (dateRange.from) {
    const fromDate = dateRange.from.toISOString().split('T')[0];
    query = query.gte('date', fromDate);
  }
  if (dateRange.to) {
    const toDate = dateRange.to.toISOString().split('T')[0];
    query = query.lte('date', toDate);
  }
  return query;
};

export const buildAdSpendQuery = (selectedProject: string, dateRange: DateRange) => {
  let query = supabase.from('facebook_ad_spend').select('spend');
  if (selectedProject !== 'ALL') {
    query = query.eq('project_name', selectedProject);
  }
  if (dateRange.from) {
    const fromDate = dateRange.from.toISOString().split('T')[0];
    query = query.gte('date', fromDate);
  }
  if (dateRange.to) {
    const toDate = dateRange.to.toISOString().split('T')[0];
    query = query.lte('date', toDate);
  }
  return query;
};
