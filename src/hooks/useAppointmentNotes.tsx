import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface AppointmentNote {
  id: string;
  appointment_id: string;
  note_text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useAppointmentNotes = (appointmentId: string) => {
  const [notes, setNotes] = useState<AppointmentNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointment_notes')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointment notes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (noteText: string, createdBy: string) => {
    if (!noteText.trim()) return;
    
    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('appointment_notes')
        .insert({
          appointment_id: appointmentId,
          note_text: noteText.trim(),
          created_by: createdBy
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new note to the beginning of the list
      setNotes(prev => [data, ...prev]);
      
      toast({
        title: "Success",
        description: "Note added successfully",
      });

      return true;
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive"
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (appointmentId) {
      fetchNotes();
    }
  }, [appointmentId]);

  return {
    notes,
    loading,
    submitting,
    addNote,
    refreshNotes: fetchNotes
  };
};