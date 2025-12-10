import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { User, ExternalLink, Calendar, X, Phone, Mail } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Message } from "./types";
import { useNavigate } from "react-router-dom";

interface ModernMessageBubbleProps {
  message: Message;
  projectName?: string;
  currentUserEmail?: string;
}

export function ModernMessageBubble({ message, projectName, currentUserEmail }: ModernMessageBubbleProps) {
  const navigate = useNavigate();
  const [showPatientModal, setShowPatientModal] = useState(false);
  // Place current user's messages on the right, others on the left
  const isCurrentUser = currentUserEmail && message.sender_email === currentUserEmail;
  const senderName = message.sender_name || "Team Member";
  const patientRef = message.patient_reference;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePatientClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (patientRef) {
      setShowPatientModal(true);
    }
  };

  const handleViewInPortal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (projectName && patientRef?.contact_id) {
      // Navigate to project portal with the contact highlighted
      navigate(`/project/${encodeURIComponent(projectName)}`, {
        state: { highlightContactId: patientRef.contact_id }
      });
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex gap-3 mb-4 animate-fade-in",
          isCurrentUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback
            className={cn(
              "text-xs",
              isCurrentUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {getInitials(senderName)}
          </AvatarFallback>
        </Avatar>

        <div className={cn("flex flex-col gap-1 max-w-[70%]", isCurrentUser && "items-end")}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{senderName}</span>
            <span>•</span>
            <span>
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
            {!message.read_at && !isCurrentUser && (
              <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                New
              </Badge>
            )}
          </div>

          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 shadow-sm",
              isCurrentUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            )}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.message}
            </p>

            {patientRef && (
              <div className="mt-2 pt-2 border-t border-current/10 flex items-center gap-2">
                <button
                  onClick={handlePatientClick}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    isCurrentUser
                      ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
                      : "bg-primary/10 hover:bg-primary/20 text-primary"
                  )}
                >
                  <User className="w-3 h-3" />
                  <span>{patientRef.name || patientRef.patient_name}</span>
                </button>
                {projectName && patientRef.contact_id && (
                  <button
                    onClick={handleViewInPortal}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors",
                      isCurrentUser
                        ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
                        : "bg-primary/10 hover:bg-primary/20 text-primary"
                    )}
                    title="View in portal"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Patient Details Modal */}
      {patientRef && (
        <Dialog open={showPatientModal} onOpenChange={setShowPatientModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(patientRef.name || patientRef.patient_name || "?")}
                  </AvatarFallback>
                </Avatar>
                {patientRef.name || patientRef.patient_name}
              </DialogTitle>
              <DialogDescription>
                Patient contact information
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {patientRef.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <a 
                      href={`tel:${patientRef.phone}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {patientRef.phone}
                    </a>
                  </div>
                </div>
              )}

              {patientRef.email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a 
                      href={`mailto:${patientRef.email}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {patientRef.email}
                    </a>
                  </div>
                </div>
              )}

              {patientRef.contact_id && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contact ID</p>
                    <p className="text-sm font-medium font-mono text-xs">
                      {patientRef.contact_id}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowPatientModal(false)}
              >
                Close
              </Button>
              {projectName && patientRef.contact_id && (
                <Button
                  onClick={(e) => {
                    handleViewInPortal(e);
                    setShowPatientModal(false);
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View in Portal
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
