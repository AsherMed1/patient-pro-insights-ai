import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, MessageSquare, Clock, User, Pencil, Trash2 } from 'lucide-react';
import { useAppointmentNotes } from '@/hooks/useAppointmentNotes';
import { useUserAttribution } from '@/hooks/useUserAttribution';
import { useRole } from '@/hooks/useRole';
import { formatDistanceToNow } from 'date-fns';
import { formatEmbeddedTimestamps } from '@/utils/dateTimeUtils';

interface AppointmentNotesProps {
  appointmentId: string;
  leadName: string;
  projectName: string;
  externalShowForm?: boolean;
  onFormToggled?: (showing: boolean) => void;
}

const AppointmentNotes = ({ appointmentId, leadName, projectName, externalShowForm, onFormToggled }: AppointmentNotesProps) => {
  const [newNote, setNewNote] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Sync with external trigger
  useEffect(() => {
    if (externalShowForm && !showAddForm) {
      setShowAddForm(true);
    }
  }, [externalShowForm]);
  const { notes, loading, submitting, addNote, updateNote, deleteNote } = useAppointmentNotes(appointmentId);
  const { userName } = useUserAttribution();
  const { canEditNotes } = useRole();
  const canModify = canEditNotes();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    const success = await addNote(newNote, userName);
    if (success) {
      setNewNote('');
      setShowAddForm(false);
      onFormToggled?.(false);
    }
  };

  const startEdit = (noteId: string, currentText: string) => {
    setEditingNoteId(noteId);
    setEditingText(currentText);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const saveEdit = async () => {
    if (!editingNoteId) return;
    setSavingEdit(true);
    const ok = await updateNote(editingNoteId, editingText, userName);
    setSavingEdit(false);
    if (ok) {
      cancelEdit();
    }
  };

  const handleDelete = async (noteId: string) => {
    await deleteNote(noteId, userName);
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Internal Notes ({notes.length})
          </span>
        </div>
        {!showAddForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add Note</span>
          </Button>
        )}
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Internal Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Enter your internal note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || submitting}
                size="sm"
              >
                {submitting ? 'Adding...' : 'Add Note'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewNote('');
                  onFormToggled?.(false);
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Loading notes...
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => {
            const isSystemNote = note.created_by === 'System';
            const isEditing = editingNoteId === note.id;
            return (
              <Card 
                key={note.id} 
                className={isSystemNote 
                  ? "bg-blue-50 border-blue-200" 
                  : "bg-yellow-50 border-yellow-200"
                }
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <User className="h-3 w-3" />
                        <span className={isSystemNote ? "font-medium text-blue-700" : ""}>
                          {note.created_by}
                        </span>
                        {isSystemNote && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                            Auto
                          </Badge>
                        )}
                        {note.last_edited_by && (
                          <Badge variant="outline" className="text-xs">
                            edited by {note.last_edited_by}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(note.created_at)}</span>
                        {canModify && !isEditing && (
                          <div className="flex items-center space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => startEdit(note.id, note.note_text)}
                              title="Edit note"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  title="Delete note"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. The note will be permanently removed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(note.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[80px] resize-none"
                        />
                        <div className="flex items-center space-x-2">
                          <Button size="sm" onClick={saveEdit} disabled={!editingText.trim() || savingEdit}>
                            {savingEdit ? 'Saving...' : 'Save'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-sm whitespace-pre-wrap ${
                        isSystemNote ? "text-blue-800 font-medium" : "text-foreground"
                      }`}>
                        {formatEmbeddedTimestamps(note.note_text)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
          No internal notes yet. Add one to track important information about this appointment.
        </div>
      )}
    </div>
  );
};

export default AppointmentNotes;
