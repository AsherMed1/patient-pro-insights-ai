import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Clock, User } from 'lucide-react';
import { useAppointmentNotes } from '@/hooks/useAppointmentNotes';
import { useUserAttribution } from '@/hooks/useUserAttribution';
import { formatDistanceToNow } from 'date-fns';
import { formatEmbeddedTimestamps } from '@/utils/dateTimeUtils';

interface AppointmentNotesProps {
  appointmentId: string;
  leadName: string;
  projectName: string;
}

const AppointmentNotes = ({ appointmentId, leadName, projectName }: AppointmentNotesProps) => {
  const [newNote, setNewNote] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const { notes, loading, submitting, addNote } = useAppointmentNotes(appointmentId);
  const { userName } = useUserAttribution();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    const success = await addNote(newNote, userName);
    if (success) {
      setNewNote('');
      setShowAddForm(false);
    }
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
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
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
        <div className="text-sm text-gray-500 text-center py-4">
          Loading notes...
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => {
            const isSystemNote = note.created_by === 'System';
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
                    <div className="flex items-center justify-between text-xs text-gray-500">
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
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(note.created_at)}</span>
                      </div>
                    </div>
                    <p className={`text-sm whitespace-pre-wrap ${
                      isSystemNote ? "text-blue-800 font-medium" : "text-gray-800"
                    }`}>
                      {formatEmbeddedTimestamps(note.note_text)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-300 rounded-lg">
          No internal notes yet. Add one to track important information about this appointment.
        </div>
      )}
    </div>
  );
};

export default AppointmentNotes;