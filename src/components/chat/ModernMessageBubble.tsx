import { formatDistanceToNow } from "date-fns";
import { User, ExternalLink, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Message } from "./types";
import { useNavigate } from "react-router-dom";

interface ModernMessageBubbleProps {
  message: Message;
  projectName?: string;
}

export function ModernMessageBubble({ message, projectName }: ModernMessageBubbleProps) {
  const navigate = useNavigate();
  const isOutbound = message.direction === "outbound";
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

  const handlePatientClick = () => {
    if (patientRef?.appointment_id && projectName) {
      navigate(`/project/${encodeURIComponent(projectName)}`);
      // Scroll to appointment or open modal - implement as needed
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3 mb-4 animate-fade-in",
        isOutbound ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs",
            isOutbound
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {getInitials(senderName)}
        </AvatarFallback>
      </Avatar>

      <div className={cn("flex flex-col gap-1 max-w-[70%]", isOutbound && "items-end")}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{senderName}</span>
          <span>•</span>
          <span>
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {!message.read_at && !isOutbound && (
            <Badge variant="default" className="h-5 px-1.5 text-[10px]">
              New
            </Badge>
          )}
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 shadow-sm",
            isOutbound
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.message}
          </p>

          {patientRef && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <button
                onClick={handlePatientClick}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  isOutbound
                    ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
                    : "bg-primary/10 hover:bg-primary/20 text-primary"
                )}
              >
                <User className="w-3 h-3" />
                <span>{patientRef.patient_name}</span>
                {patientRef.appointment_id && (
                  <Calendar className="w-3 h-3" />
                )}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
