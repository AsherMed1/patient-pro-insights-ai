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
  attachments?: any;
  visibility?: 'internal' | 'clinic';
}


/**
 * Batched loader: with 50 appointment cards on screen each card used to fire its
 * own `appointment_notes` query. Requests raised within the same tick are
 * coalesced into a single `in(...)` query to keep database load down.
 */
type Waiter = { id: string; resolve: (rows: AppointmentNote[]) => void; reject: (e: any) => void };
let pendingIds = new Set<string>();
let waiters: Waiter[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const flushNoteBatch = async () => {
  flushTimer = null;
  const ids = Array.from(pendingIds);
  const batch = waiters;
  pendingIds = new Set();
  waiters = [];

  try {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));

    const rows: AppointmentNote[] = [];
    for (const chunk of chunks) {
      const { data, error } = await supabase
        .from('appointment_notes')
        .select('*')
        .in('appointment_id', chunk)
        .order('created_at', { ascending: false });
      if (error) throw error;
      rows.push(...((data || []) as AppointmentNote[]));
    }

    const byAppointment = new Map<string, AppointmentNote[]>();
    rows.forEach((n) => {
      const list = byAppointment.get(n.appointment_id) || [];
      list.push(n);
      byAppointment.set(n.appointment_id, list);
    });

    batch.forEach((w) => w.resolve(byAppointment.get(w.id) || []));
  } catch (e) {
    batch.forEach((w) => w.reject(e));
  }
};

const loadNotesBatched = (appointmentId: string): Promise<AppointmentNote[]> =>
  new Promise((resolve, reject) => {
    pendingIds.add(appointmentId);
    waiters.push({ id: appointmentId, resolve, reject });
    if (!flushTimer) flushTimer = setTimeout(flushNoteBatch, 60);
  });

export const useAppointmentNotes = (appointmentId: string) => {
  const [notes, setNotes] = useState<AppointmentNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchNotes = async () => {
    try {
      setLoading(true);
      let rows: AppointmentNote[];
      try {
        rows = await loadNotesBatched(appointmentId);
      } catch (first) {
        // One quiet retry: a single slow/timed-out response shouldn't alarm the user.
        console.warn('Notes fetch failed, retrying once:', first);
        await new Promise((r) => setTimeout(r, 1200));
        rows = await loadNotesBatched(appointmentId);
      }
      setNotes(rows);
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

  const addNote = async (
    noteText: string,
    createdBy: string,
    attachments: any[] = [],
    visibility: 'internal' | 'clinic' = 'clinic',
  ) => {
    if (!noteText.trim() && attachments.length === 0) return;

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('appointment_notes')
        .insert({
          appointment_id: appointmentId,
          note_text: noteText.trim(),
          created_by: createdBy,
          attachments: (attachments ?? []) as any,
          visibility,
        } as any)
        .select()
        .single();


      if (error) throw error;

      // Add the new note to the beginning of the list
      setNotes(prev => [data as AppointmentNote, ...prev]);
      
      toast({
        title: "Success",
        description: "Note added successfully",
      });

      return data as AppointmentNote;
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive"
      });
      return null;
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

  const setNoteVisibility = async (
    noteId: string,
    visibility: 'internal' | 'clinic',
    changedBy: string,
  ) => {
    try {
      const { data, error } = await supabase
        .from('appointment_notes')
        .update({ visibility } as any)
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => prev.map(n => (n.id === noteId ? (data as AppointmentNote) : n)));

      try {
        await supabase.rpc('log_audit_event', {
          p_entity: 'appointment_note',
          p_action: 'note_visibility_changed',
          p_description: `Note marked ${visibility === 'internal' ? 'internal only' : 'clinic visible'} by ${changedBy}`,
          p_source: 'manual',
          p_metadata: { note_id: noteId, appointment_id: appointmentId, visibility },
        });
      } catch (e) {
        console.warn('audit log failed', e);
      }

      toast({
        title: visibility === 'internal' ? 'Marked internal' : 'Marked clinic visible',
        description:
          visibility === 'internal'
            ? 'This note is now hidden from the clinic.'
            : 'This note is now visible to the clinic.',
      });
      return true;
    } catch (error) {
      console.error('Error updating note visibility:', error);
      toast({ title: 'Error', description: 'Failed to update note visibility', variant: 'destructive' });
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