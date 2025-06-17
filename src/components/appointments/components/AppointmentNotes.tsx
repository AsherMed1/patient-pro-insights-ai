
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Plus, X, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

interface AppointmentNote {
  id: string;
  note_text: string;
  created_at: string;
  created_by: string | null;
}

interface AppointmentNotesProps {
  appointmentId: string;
}

const AppointmentNotes = ({ appointmentId }: AppointmentNotesProps) => {
  const [notes, setNotes] = useState<AppointmentNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingNotes, setFetchingNotes] = useState(true);
  const [deletingNotes, setDeletingNotes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchNotes();
  }, [appointmentId]);

  const fetchNotes = async () => {
    try {
      setFetchingNotes(true);
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
        description: "Failed to fetch notes",
        variant: "destructive",
      });
    } finally {
      setFetchingNotes(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('appointment_notes')
        .insert({
          appointment_id: appointmentId,
          note_text: newNote.trim(),
          created_by: 'User' // You can replace this with actual user info if available
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note added successfully",
      });

      setNewNote('');
      setShowAddNote(false);
      fetchNotes(); // Refresh notes
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      setDeletingNotes(prev => new Set(prev).add(noteId));
      const { error } = await supabase
        .from('appointment_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note deleted successfully",
      });

      fetchNotes(); // Refresh notes
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    } finally {
      setDeletingNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });
    }
  };

  if (fetchingNotes) {
    return (
      <div className="mt-4">
        <div className="flex items-center space-x-2 mb-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Notes</span>
        </div>
        <div className="text-sm text-gray-500">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Notes {notes.length > 0 && `(${notes.length})`}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddNote(!showAddNote)}
          className="flex items-center gap-1"
        >
          {showAddNote ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showAddNote ? 'Cancel' : 'Add Note'}
        </Button>
      </div>

      {showAddNote && (
        <Card className="border-dashed">
          <CardContent className="p-3 space-y-3">
            <Textarea
              placeholder="Add a note about this appointment..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[60px] resize-none"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddNote(false);
                  setNewNote('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={addNote}
                disabled={loading || !newNote.trim()}
              >
                {loading ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((note) => (
            <Card key={note.id} className="bg-gray-50">
              <CardContent className="p-3">
                <div className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">
                  {note.note_text}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {note.created_by && `By ${note.created_by} • `}
                    {format(new Date(note.created_at), 'MMM dd, yyyy at h:mm a')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNote(note.id)}
                    disabled={deletingNotes.has(note.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {notes.length === 0 && !showAddNote && (
        <div className="text-sm text-gray-500 italic">
          No notes yet. Click "Add Note" to add the first note.
        </div>
      )}
    </div>
  );
};

export default AppointmentNotes;
