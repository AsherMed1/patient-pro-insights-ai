
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from '@/components/appointments/utils';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  type: 'appointments' | 'calls' | 'leads' | 'agents' | 'projects' | 'adspend';
}

const DataModal = ({ isOpen, onClose, title, data, type }: DataModalProps) => {
  const renderContent = () => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No data available</p>
        </div>
      );
    }

    switch (type) {
      case 'appointments':
        return (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.map((appointment, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">{appointment.lead_name}</h4>
                    <Badge variant="outline">{appointment.project_name}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Date: {formatDate(appointment.date_of_appointment)}</p>
                    {appointment.lead_phone_number && (
                      <p>Phone: {appointment.lead_phone_number}</p>
                    )}
                    {appointment.status && (
                      <p>Status: {appointment.status}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );

      case 'calls':
        return (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.map((call, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">{call.lead_name}</h4>
                    <Badge variant="outline">{call.project_name}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Phone: {call.lead_phone_number}</p>
                    <p>Duration: {Math.round(call.duration_seconds / 60)} minutes</p>
                    <p>Status: {call.status}</p>
                    <p>Direction: {call.direction}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );

      case 'leads':
        return (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.map((lead, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">{lead.lead_name}</h4>
                    <Badge variant="outline">{lead.project_name}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {lead.phone_number && <p>Phone: {lead.phone_number}</p>}
                    {lead.email && <p>Email: {lead.email}</p>}
                    <p>Date: {formatDate(lead.date)}</p>
                    {lead.status && <p>Status: {lead.status}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );

      case 'agents':
        return (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.map((agent, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-2">
                  <h4 className="font-semibold">{agent.agent_name}</h4>
                  <div className="text-sm text-gray-600">
                    <p>Agent Number: {agent.agent_number}</p>
                    <p>Status: {agent.active ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );

      case 'projects':
        return (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.map((project, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-2">
                  <h4 className="font-semibold">{project.project_name}</h4>
                  <div className="text-sm text-gray-600">
                    <p>Created: {formatDate(project.created_at)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );

      case 'adspend':
        return (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.map((spend, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">{spend.project_name}</h4>
                    <Badge variant="outline">${spend.spend}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Date: {formatDate(spend.date)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            {data.map((item, index) => (
              <Card key={index} className="p-3">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(item, null, 2)}
                </pre>
              </Card>
            ))}
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default DataModal;
