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
  last_edited_by?: string | null;
  last_edited_at?: string | null;
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

  const updateNote = async (noteId: string, newText: string, editedBy: string) => {
    if (!newText.trim()) return false;
    try {
      const { data, error } = await supabase
        .from('appointment_notes')
        .update({
          note_text: newText.trim(),
          last_edited_by: editedBy,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => prev.map(n => (n.id === noteId ? (data as AppointmentNote) : n)));

      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment_note',
          p_action: 'note_edited',
          p_description: `Note edited by ${editedBy}`,
          p_source: 'manual',
          p_metadata: { note_id: noteId, appointment_id: appointmentId },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      toast({ title: 'Success', description: 'Note updated' });
      return true;
    } catch (error) {
      console.error('Error updating note:', error);
      toast({ title: 'Error', description: 'Failed to update note', variant: 'destructive' });
      return false;
    }
  };

  const deleteNote = async (noteId: string, deletedBy: string) => {
    try {
      const { error } = await supabase
        .from('appointment_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== noteId));

      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment_note',
          p_action: 'note_deleted',
          p_description: `Note deleted by ${deletedBy}`,
          p_source: 'manual',
          p_metadata: { note_id: noteId, appointment_id: appointmentId },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      toast({ title: 'Success', description: 'Note deleted' });
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' });
      return false;
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
    updateNote,
    deleteNote,
    refreshNotes: fetchNotes
  };
};