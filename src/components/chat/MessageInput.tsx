import { useState, useRef, useEffect } from "react";
import { Send, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PatientSearchCombobox } from "./PatientSearchCombobox";
import type { Patient } from "./types";

interface MessageInputProps {
  onSendMessage: (message: string, patientReference?: Patient) => void;
  projectName: string;
  sending: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSendMessage,
  projectName,
  sending,
  placeholder = "Type a message... (Use @ to mention a patient)",
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setMessage(value);
    setCursorPosition(cursorPos);

    // Check if @ was just typed
    const lastChar = value[cursorPos - 1];
    if (lastChar === "@") {
      setShowPatientSearch(true);
    } else if (showPatientSearch && value[cursorPos - 1] === " ") {
      setShowPatientSearch(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    
    // Replace @ with patient name
    const beforeCursor = message.slice(0, cursorPosition - 1);
    const afterCursor = message.slice(cursorPosition);
    const newMessage = `${beforeCursor}@${patient.lead_name}${afterCursor}`;
    
    setMessage(newMessage);
    setShowPatientSearch(false);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSend = () => {
    if (!message.trim() || sending) return;

    onSendMessage(message.trim(), selectedPatient || undefined);
    setMessage("");
    setSelectedPatient(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape" && showPatientSearch) {
      setShowPatientSearch(false);
    }
  };

  return (
    <div className="relative border-t bg-background p-4">
      <PatientSearchCombobox
        projectName={projectName}
        onSelectPatient={handleSelectPatient}
        open={showPatientSearch}
        onOpenChange={setShowPatientSearch}
      />

      {selectedPatient && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Patient referenced:</span>
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
            <AtSign className="w-3 h-3" />
            <span>{selectedPatient.lead_name}</span>
            <button
              onClick={() => setSelectedPatient(null)}
              className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={sending}
          className="min-h-[44px] max-h-[200px] resize-none rounded-xl"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          size="icon"
          className="h-11 w-11 rounded-xl flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send • Shift + Enter for new line • @ to mention patient
      </p>
    </div>
  );
}
