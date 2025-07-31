import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, Mail, MapPin, Calendar, Building, FileText, Shield, Camera, AlertTriangle, CalendarCheck } from 'lucide-react';
import { formatDateInCentralTime, formatDateTimeForTable } from '@/utils/dateTimeUtils';
import { supabase } from '@/integrations/supabase/client';
import { AllAppointment } from '@/components/appointments/types';

interface NewLead {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  times_called: number;
  created_at: string;
  updated_at: string;
  actual_calls_count?: number;
  contact_id?: string;
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
  ai_summary?: string;
}
interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: NewLead | null;
}
const LeadDetailsModal = ({
  isOpen,
  onClose,
  lead
}: LeadDetailsModalProps) => {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const getDisplayName = () => {
    if (lead?.first_name && lead?.last_name) {
      return `${lead.first_name} ${lead.last_name}`;
    }
    return lead?.lead_name || '';
  };
  const fetchAssociatedAppointments = async () => {
    if (!lead) return;
    try {
      setAppointmentsLoading(true);
      const {
        data,
        error
      } = await supabase.from('all_appointments').select('*').eq('lead_name', lead.lead_name).eq('project_name', lead.project_name).order('date_appointment_created', {
        ascending: false
      });
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };
  useEffect(() => {
    if (isOpen && lead) {
      fetchAssociatedAppointments();
    }
  }, [isOpen, lead]);

  // Early return AFTER all hooks are declared
  if (!lead) return null;
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return formatDateInCentralTime(dateString);
  };
  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return null;
    return formatDateTimeForTable(dateTimeString);
  };
  const InfoSection = ({
    title,
    icon: Icon,
    children
  }: {
    title: string;
    icon: any;
    children: React.ReactNode;
  }) => <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Icon className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>;
  const InfoRow = ({
    label,
    value,
    type = 'text'
  }: {
    label: string;
    value: any;
    type?: 'text' | 'boolean' | 'date' | 'datetime';
  }) => {
    if (value === null || value === undefined || value === '') return null;
    let displayValue = value;
    if (type === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else if (type === 'date') {
      displayValue = formatDate(value);
    } else if (type === 'datetime') {
      displayValue = formatDateTime(value);
    }
    return <div className="flex justify-between items-start py-1 border-b border-gray-100 last:border-b-0">
        <span className="text-sm font-medium text-gray-600 w-1/3">{label}:</span>
        <span className="text-sm text-gray-900 w-2/3 text-right">{displayValue}</span>
      </div>;
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <User className="h-6 w-6" />
            <span>Lead Details: {getDisplayName()}</span>
            {lead.status && <Badge variant="outline" className="ml-2">
                {lead.status}
              </Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information */}
          <InfoSection title="Basic Information" icon={User}>
            <InfoRow label="Full Name" value={getDisplayName()} />
            <InfoRow label="Contact ID" value={lead.contact_id} />
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
          {(lead.phone_number || lead.email || lead.address) && <InfoSection title="Contact Information" icon={Phone}>
              <InfoRow label="Phone Number" value={lead.phone_number} />
              <InfoRow label="Email" value={lead.email} />
              <InfoRow label="Address" value={lead.address} />
            </InfoSection>}

          {/* Appointment Information */}
          {(lead.appt_date || lead.calendar_location || lead.procedure_ordered) && <InfoSection title="Appointment Information" icon={Calendar}>
              <InfoRow label="Appointment Date" value={lead.appt_date} type="date" />
              <InfoRow label="Calendar Location" value={lead.calendar_location} />
              <InfoRow label="Procedure Ordered" value={lead.procedure_ordered} type="boolean" />
            </InfoSection>}

          {/* Insurance Information */}
          {(lead.insurance_provider || lead.insurance_id || lead.insurance_plan || lead.group_number) && <InfoSection title="Insurance Information" icon={Shield}>
              <InfoRow label="Insurance Provider" value={lead.insurance_provider} />
              <InfoRow label="Insurance ID" value={lead.insurance_id} />
              <InfoRow label="Insurance Plan" value={lead.insurance_plan} />
              <InfoRow label="Group Number" value={lead.group_number} />
            </InfoSection>}


          {/* Patient Intake Notes */}
          {lead.patient_intake_notes && <InfoSection title="Patient Intake Notes" icon={FileText}>
              <div className="py-2 space-y-3">
                <span className="text-sm font-medium text-gray-600">Raw Notes:</span>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{lead.patient_intake_notes}</p>
                </div>
                {lead.ai_summary && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">AI Formatted Summary:</span>
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400 mt-2">
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-gray-800">{lead.ai_summary}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </InfoSection>}

          {/* Associated Appointments */}
          <InfoSection title={`Associated Appointments (${appointments.length})`} icon={CalendarCheck}>
            {appointmentsLoading ? <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div> : appointments.length > 0 ? <div className="space-y-3">
                {appointments.map(appointment => <div key={appointment.id} className="bg-muted/50 p-3 rounded-lg border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Created:</span>
                        <p className="text-foreground">{formatDate(appointment.date_appointment_created)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Appointment:</span>
                        <p className="text-foreground">{appointment.date_of_appointment ? formatDate(appointment.date_of_appointment) : 'Not set'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Agent:</span>
                        <p className="text-foreground">{appointment.agent || 'Not assigned'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Status:</span>
                        <div className="flex items-center space-x-2">
                          {appointment.confirmed && <Badge variant="default" className="text-xs">Confirmed</Badge>}
                          {appointment.showed === true && <Badge variant="secondary" className="text-xs">Showed</Badge>}
                          {appointment.showed === false}
                          {appointment.procedure_ordered && <Badge variant="outline" className="text-xs">Procedure Ordered</Badge>}
                          {appointment.status && <Badge variant="outline" className="text-xs">{appointment.status}</Badge>}
                        </div>
                      </div>
                      {appointment.calendar_name && <div className="col-span-2">
                          <span className="font-medium text-muted-foreground">Calendar:</span>
                          <p className="text-foreground">{appointment.calendar_name}</p>
                        </div>}
                      {appointment.requested_time && <div className="col-span-2">
                          <span className="font-medium text-muted-foreground">Requested Time:</span>
                          <p className="text-foreground">{appointment.requested_time}</p>
                        </div>}
                      {appointment.patient_intake_notes && <div className="col-span-full">
                          <span className="font-medium text-muted-foreground">Patient Intake Notes:</span>
                          <div className="bg-blue-50 p-2 rounded-md border-l-4 border-blue-400">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.patient_intake_notes}</p>
                          </div>
                          {appointment.ai_summary && (
                            <div className="bg-green-50 p-2 rounded-md border-l-4 border-green-400 mt-2">
                              <span className="text-xs font-medium text-muted-foreground">AI Summary:</span>
                              <div className="whitespace-pre-wrap text-sm text-gray-800 mt-1">{appointment.ai_summary}</div>
                            </div>
                          )}
                        </div>}
                    </div>
                  </div>)}
              </div> : <div className="text-center py-6 text-muted-foreground">
                <CalendarCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No appointments found for this lead</p>
              </div>}
          </InfoSection>

          {/* Additional Information */}
          {(lead.notes || lead.card_image) && <InfoSection title="Additional Information" icon={FileText}>
              <InfoRow label="Notes" value={lead.notes} />
              <InfoRow label="Card Image" value={lead.card_image} />
            </InfoSection>}
        </div>
      </DialogContent>
    </Dialog>;
};
export default LeadDetailsModal;