import { format, isToday, isYesterday, isThisWeek } from "date-fns";

interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const messageDate = new Date(date);
  
  let displayText = format(messageDate, "MMMM d, yyyy");
  
  if (isToday(messageDate)) {
    displayText = "Today";
  } else if (isYesterday(messageDate)) {
    displayText = "Yesterday";
  } else if (isThisWeek(messageDate)) {
    displayText = format(messageDate, "EEEE");
  }

  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground px-3 py-1 bg-muted rounded-full">
        {displayText}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
