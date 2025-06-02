import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, ExternalLink, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeForTable } from '@/utils/dateTimeUtils';

interface CallRecord {
  id: string;
  date: string;
  call_datetime: string;
  lead_name: string;
  lead_phone_number: string;
  project_name: string;
  direction: string;
  status: string;
  duration_seconds: number;
  agent: string | null;
  recording_url: string | null;
  call_summary: string | null;
}

interface CallDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  calls: CallRecord[];
}

const CallDetailsModal = ({ isOpen, onClose, leadName, calls }: CallDetailsModalProps) => {
  const formatDateTime = (dateTimeString: string) => {
    return formatDateTimeForTable(dateTimeString);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Call History for {leadName}</span>
          </DialogTitle>
          <DialogDescription>
            {calls.length} call{calls.length !== 1 ? 's' : ''} found for this lead (Times in Central Time Zone)
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {calls.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No calls found for this lead
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time (CT)</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{formatDateTime(call.call_datetime)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{call.lead_phone_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={call.direction === 'inbound' ? 'default' : 'secondary'}>
                        {call.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {call.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDuration(call.duration_seconds)}</span>
                    </TableCell>
                    <TableCell>
                      {call.agent && (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{call.agent}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {call.recording_url && (
                          <a
                            href={call.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Recording</span>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {calls.some(call => call.call_summary) && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Call Summaries</h4>
              <div className="space-y-3">
                {calls
                  .filter(call => call.call_summary)
                  .map((call) => (
                    <div key={call.id} className="border rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-2">
                        {formatDateTime(call.call_datetime)}
                      </div>
                      <div className="text-sm">{call.call_summary}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallDetailsModal;
