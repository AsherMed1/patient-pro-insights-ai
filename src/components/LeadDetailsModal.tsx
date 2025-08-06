import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Phone, Mail, Calendar, FileText, Shield, MapPin, Activity, Building2 } from "lucide-react";
import { format } from "date-fns";
import { AllAppointment } from "@/components/appointments/types";
import { findAssociatedAppointments } from "@/utils/appointmentLeadMatcher";

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
}

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: NewLead;
}

const LeadDetailsModal = ({ isOpen, onClose, lead }: LeadDetailsModalProps) => {
  const [associatedAppointments, setAssociatedAppointments] = useState<AllAppointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  const fetchAssociatedAppointments = async () => {
    if (!lead) return;
    
    try {
      setIsLoadingAppointments(true);
      const appointments = await findAssociatedAppointments(lead);
      setAssociatedAppointments(appointments);
    } catch (error) {
      console.error('Error fetching associated appointments:', error);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  useEffect(() => {
    if (isOpen && lead) {
      fetchAssociatedAppointments();
    }
  }, [isOpen, lead]);

  const getDisplayName = () => {
    if (!lead) return 'Unknown Lead';
    
    if (lead.first_name || lead.last_name) {
      return `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
    }
    return lead.lead_name || 'Unknown Lead';
  };

  const InfoSection = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>
  );

  const InfoRow = ({ label, value, type = "text" }: { label: string; value: any; type?: "text" | "boolean" | "date" | "datetime" }) => {
    if (value === null || value === undefined || value === '') return null;
    
    let displayValue = value;
    
    if (type === "boolean") {
      displayValue = value ? "Yes" : "No";
    } else if (type === "date" && value) {
      try {
        displayValue = format(new Date(value), 'MMM dd, yyyy');
      } catch {
        displayValue = value;
      }
    } else if (type === "datetime" && value) {
      try {
        displayValue = format(new Date(value), 'MMM dd, yyyy HH:mm');
      } catch {
        displayValue = value;
      }
    }

    return (
      <div className="grid grid-cols-3 gap-2 text-sm">
        <span className="font-medium text-gray-600">{label}:</span>
        <span className="col-span-2 text-gray-900">{displayValue}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Lead Details: {getDisplayName()}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Basic Information */}
            <InfoSection title="Basic Information" icon={User}>
              <InfoRow label="Full Name" value={getDisplayName()} />
              <InfoRow label="Project" value={lead.project_name} />
              <InfoRow label="Date of Birth" value={lead.dob} type="date" />
              <InfoRow label="Status" value={lead.status} />
              <InfoRow label="Times Called" value={lead.times_called} />
              <InfoRow label="Procedure Ordered" value={lead.procedure_ordered} type="boolean" />
            </InfoSection>

            {/* Contact Information */}
            <InfoSection title="Contact Information" icon={Phone}>
              <InfoRow label="Phone Number" value={lead.phone_number} />
              <InfoRow label="Email" value={lead.email} />
              <InfoRow label="Address" value={lead.address} />
              <InfoRow label="Contact ID" value={lead.contact_id} />
            </InfoSection>

            {/* Appointment Information */}
            <InfoSection title="Appointment Information" icon={Calendar}>
              <InfoRow label="Appointment Date" value={lead.appt_date} type="date" />
              <InfoRow label="Calendar Location" value={lead.calendar_location} />
            </InfoSection>

            {/* Insurance Information */}
            <InfoSection title="Insurance Information" icon={Shield}>
              <InfoRow label="Provider" value={lead.insurance_provider} />
              <InfoRow label="Plan" value={lead.insurance_plan} />
              <InfoRow label="Insurance ID" value={lead.insurance_id} />
              <InfoRow label="Group Number" value={lead.group_number} />
            </InfoSection>

            {/* Notes */}
            {(lead.notes || lead.patient_intake_notes) && (
              <InfoSection title="Notes" icon={FileText}>
                {lead.notes && <InfoRow label="General Notes" value={lead.notes} />}
                {lead.patient_intake_notes && (
                  <div className="space-y-1">
                    <span className="font-medium text-gray-600 text-sm">Patient Intake Notes:</span>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border">
                      {lead.patient_intake_notes}
                    </div>
                  </div>
                )}
              </InfoSection>
            )}

            {/* Associated Appointments */}
            <InfoSection title="Associated Appointments" icon={Activity}>
              {isLoadingAppointments ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : associatedAppointments.length > 0 ? (
                <div className="space-y-3">
                  {associatedAppointments.filter(appointment => appointment && appointment.project_name).map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{appointment.lead_name || 'Unknown'}</span>
                        <Badge variant="outline">{appointment.status || 'Pending'}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Project: {appointment.project_name}</div>
                        <div>Created: {format(new Date(appointment.date_appointment_created), 'MMM dd, yyyy')}</div>
                        {appointment.date_of_appointment && (
                          <div>Appointment: {format(new Date(appointment.date_of_appointment), 'MMM dd, yyyy')}</div>
                        )}
                        {appointment.agent && <div>Agent: {appointment.agent}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No associated appointments found.</p>
              )}
            </InfoSection>

            {/* System Information */}
            <InfoSection title="System Information" icon={Building2}>
              <InfoRow label="Lead ID" value={lead.id} />
              <InfoRow label="Created" value={lead.created_at} type="datetime" />
              <InfoRow label="Updated" value={lead.updated_at} type="datetime" />
              <InfoRow label="Lead Date" value={lead.date} type="date" />
            </InfoSection>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsModal;