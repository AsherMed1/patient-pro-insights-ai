
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Mail, MapPin, Calendar, Building, FileText, Shield, Camera, AlertTriangle } from 'lucide-react';
import { formatDateInCentralTime, formatDateTimeForTable } from '@/utils/dateTimeUtils';

interface NewLead {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  times_called: number;
  created_at: string;
  updated_at: string;
  actual_calls_count?: number;
  appt_date?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  status?: string;
  procedure_ordered?: boolean;
  phone_number?: string;
  calendar_location?: string;
  insurance_provider?: string;
  insurance_id?: string;
  insurance_plan?: string;
  group_number?: string;
  address?: string;
  notes?: string;
  card_image?: string;
  email?: string;
  patient_intake_notes?: string;
}

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: NewLead | null;
}

const LeadDetailsModal = ({ isOpen, onClose, lead }: LeadDetailsModalProps) => {
  if (!lead) return null;

  const getDisplayName = () => {
    if (lead.first_name && lead.last_name) {
      return `${lead.first_name} ${lead.last_name}`;
    }
    return lead.lead_name;
  };


  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return formatDateInCentralTime(dateString);
  };

  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return null;
    return formatDateTimeForTable(dateTimeString);
  };

  const InfoSection = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Icon className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>
  );

  const InfoRow = ({ label, value, type = 'text' }: { label: string; value: any; type?: 'text' | 'boolean' | 'date' | 'datetime' }) => {
    if (value === null || value === undefined || value === '') return null;
    
    let displayValue = value;
    if (type === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else if (type === 'date') {
      displayValue = formatDate(value);
    } else if (type === 'datetime') {
      displayValue = formatDateTime(value);
    }

    return (
      <div className="flex justify-between items-start py-1 border-b border-gray-100 last:border-b-0">
        <span className="text-sm font-medium text-gray-600 w-1/3">{label}:</span>
        <span className="text-sm text-gray-900 w-2/3 text-right">{displayValue}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <User className="h-6 w-6" />
            <span>Lead Details: {getDisplayName()}</span>
            {lead.status && (
              <Badge variant="outline" className="ml-2">
                {lead.status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information */}
          <InfoSection title="Basic Information" icon={User}>
            <InfoRow label="Full Name" value={getDisplayName()} />
            <InfoRow label="First Name" value={lead.first_name} />
            <InfoRow label="Last Name" value={lead.last_name} />
            <InfoRow label="Date of Birth" value={lead.dob} type="date" />
            <InfoRow label="Project" value={lead.project_name} />
            <InfoRow label="Lead Date" value={lead.date} type="date" />
            <InfoRow label="Times Called" value={lead.times_called} />
            <InfoRow label="Actual Calls" value={lead.actual_calls_count} />
            <InfoRow label="Created" value={lead.created_at} type="datetime" />
          </InfoSection>

          {/* Contact Information */}
          {(lead.phone_number || lead.email || lead.address) && (
            <InfoSection title="Contact Information" icon={Phone}>
              <InfoRow label="Phone Number" value={lead.phone_number} />
              <InfoRow label="Email" value={lead.email} />
              <InfoRow label="Address" value={lead.address} />
            </InfoSection>
          )}

          {/* Appointment Information */}
          {(lead.appt_date || lead.calendar_location || lead.procedure_ordered) && (
            <InfoSection title="Appointment Information" icon={Calendar}>
              <InfoRow label="Appointment Date" value={lead.appt_date} type="date" />
              <InfoRow label="Calendar Location" value={lead.calendar_location} />
              <InfoRow label="Procedure Ordered" value={lead.procedure_ordered} type="boolean" />
            </InfoSection>
          )}

          {/* Insurance Information */}
          {(lead.insurance_provider || lead.insurance_id || lead.insurance_plan || lead.group_number) && (
            <InfoSection title="Insurance Information" icon={Shield}>
              <InfoRow label="Insurance Provider" value={lead.insurance_provider} />
              <InfoRow label="Insurance ID" value={lead.insurance_id} />
              <InfoRow label="Insurance Plan" value={lead.insurance_plan} />
              <InfoRow label="Group Number" value={lead.group_number} />
            </InfoSection>
          )}


          {/* Patient Intake Notes */}
          {lead.patient_intake_notes && (
            <InfoSection title="Patient Intake Notes" icon={FileText}>
              <div className="py-2">
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{lead.patient_intake_notes}</p>
                </div>
              </div>
            </InfoSection>
          )}

          {/* Additional Information */}
          {(lead.notes || lead.card_image) && (
            <InfoSection title="Additional Information" icon={FileText}>
              <InfoRow label="Notes" value={lead.notes} />
              <InfoRow label="Card Image" value={lead.card_image} />
            </InfoSection>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsModal;
