import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmrQueueItem {
  id: string;
  appointment_id: string;
  project_name: string;
  status: 'pending' | 'completed';
  queued_at: string;
  processed_at: string | null;
  processed_by: string | null;
  emr_system_name: string | null;
  emr_reference_id: string | null;
  notes: string | null;
  // Joined appointment data
  lead_name: string;
  lead_phone_number: string | null;
  lead_email: string | null;
  dob: string | null;
  date_of_appointment: string | null;
  detected_insurance_provider: string | null;
  detected_insurance_plan: string | null;
  detected_insurance_id: string | null;
  // Joined profile data for processed_by
  processed_by_name: string | null;
}

export const useEmrQueue = (projectFilter?: string) => {
  const [pendingItems, setPendingItems] = useState<EmrQueueItem[]>([]);
  const [completedItems, setCompletedItems] = useState<EmrQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPending: 0,
    urgent24h: 0,
    completedToday: 0,
  });
  const { toast } = useToast();

  const fetchQueueItems = async () => {
    try {
      setLoading(true);
      
      // Build query for pending items
      let pendingQuery = supabase
        .from('emr_processing_queue')
        .select(`
          *,
          all_appointments!inner(
            lead_name,
            lead_phone_number,
            lead_email,
            dob,
            date_of_appointment,
            detected_insurance_provider,
            detected_insurance_plan,
            detected_insurance_id
          )
        `)
        .eq('status', 'pending')
        .order('queued_at', { ascending: false });

      if (projectFilter && projectFilter !== 'ALL') {
        pendingQuery = pendingQuery.eq('project_name', projectFilter);
      }

      const { data: pending, error: pendingError } = await pendingQuery;
      if (pendingError) throw pendingError;

      // Build query for completed items
      let completedQuery = supabase
        .from('emr_processing_queue')
        .select(`
          *,
          all_appointments!inner(
            lead_name,
            lead_phone_number,
            lead_email,
            dob,
            date_of_appointment,
            detected_insurance_provider,
            detected_insurance_plan,
            detected_insurance_id
          )
        `)
        .eq('status', 'completed')
        .order('processed_at', { ascending: false })
        .limit(100);

      if (projectFilter && projectFilter !== 'ALL') {
        completedQuery = completedQuery.eq('project_name', projectFilter);
      }

      const { data: completed, error: completedError } = await completedQuery;
      if (completedError) throw completedError;

      // Get user names for processed_by
      const processedByIds = [...new Set([
        ...(pending || []).map(p => p.processed_by).filter(Boolean),
        ...(completed || []).map(c => c.processed_by).filter(Boolean),
      ])];

      let userNames: Record<string, string> = {};
      if (processedByIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', processedByIds);
        
        userNames = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }

      // Transform data
      const transformedPending = (pending || []).map(item => ({
        ...item,
        status: item.status as 'pending' | 'completed',
        lead_name: item.all_appointments.lead_name,
        lead_phone_number: item.all_appointments.lead_phone_number,
        lead_email: item.all_appointments.lead_email,
        dob: item.all_appointments.dob,
        date_of_appointment: item.all_appointments.date_of_appointment,
        detected_insurance_provider: item.all_appointments.detected_insurance_provider,
        detected_insurance_plan: item.all_appointments.detected_insurance_plan,
        detected_insurance_id: item.all_appointments.detected_insurance_id,
        processed_by_name: item.processed_by ? userNames[item.processed_by] || null : null,
      }));

      const transformedCompleted = (completed || []).map(item => ({
        ...item,
        status: item.status as 'pending' | 'completed',
        lead_name: item.all_appointments.lead_name,
        lead_phone_number: item.all_appointments.lead_phone_number,
        lead_email: item.all_appointments.lead_email,
        dob: item.all_appointments.dob,
        date_of_appointment: item.all_appointments.date_of_appointment,
        detected_insurance_provider: item.all_appointments.detected_insurance_provider,
        detected_insurance_plan: item.all_appointments.detected_insurance_plan,
        detected_insurance_id: item.all_appointments.detected_insurance_id,
        processed_by_name: item.processed_by ? userNames[item.processed_by] || null : null,
      }));

      setPendingItems(transformedPending);
      setCompletedItems(transformedCompleted);

      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const urgent24h = transformedPending.filter(item => {
        const queuedDate = new Date(item.queued_at);
        const hoursDiff = (now.getTime() - queuedDate.getTime()) / (1000 * 60 * 60);
        return hoursDiff > 24;
      }).length;

      const completedToday = transformedCompleted.filter(item => {
        if (!item.processed_at) return false;
        const processedDate = new Date(item.processed_at);
        return processedDate >= today;
      }).length;

      setStats({
        totalPending: transformedPending.length,
        urgent24h,
        completedToday,
      });
    } catch (error) {
      console.error('Error fetching EMR queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to load EMR queue items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (
    queueItemId: string,
    appointmentId: string,
    emrSystemName: string,
    emrReferenceId: string,
    notes: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update queue item
      const { error: queueError } = await supabase
        .from('emr_processing_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
          emr_system_name: emrSystemName,
          emr_reference_id: emrReferenceId,
          notes: notes || null,
        })
        .eq('id', queueItemId);

      if (queueError) throw queueError;

      // Update appointment internal_process_complete flag
      const { error: apptError } = await supabase
        .from('all_appointments')
        .update({ internal_process_complete: true })
        .eq('id', appointmentId);

      if (apptError) throw apptError;

      toast({
        title: 'Success',
        description: 'Appointment marked as EMR complete',
      });

      // Refresh the queue
      await fetchQueueItems();
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark appointment as complete',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchQueueItems();
  }, [projectFilter]);

  return {
    pendingItems,
    completedItems,
    loading,
    stats,
    refreshQueue: fetchQueueItems,
    markComplete,
  };
};
