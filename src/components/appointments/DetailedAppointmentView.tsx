import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  Building, 
  FileText, 
  Shield,
  MapPin,
  Hash
} from 'lucide-react';
import { AllAppointment } from './types';
import { formatDate, formatTime } from './utils';
import AppointmentNotes from './AppointmentNotes';
import { ParsedIntakeInfo } from './ParsedIntakeInfo';
import InsuranceViewModal from '@/components/InsuranceViewModal';
import { findAssociatedLead, hasInsuranceInfo as hasInsuranceInfoUtil } from "@/utils/appointmentLeadMatcher";

interface DetailedAppointmentViewProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AllAppointment;
}

interface LeadDetails {
  contact_id?: string;
  phone_number?: string;
  email?: string;
  lead_name: string;
  project_name: string;
  insurance_provider?: string;
  insurance_plan?: string;
  insurance_id?: string;
  insurance_id_link?: string;
  group_number?: string;
  patient_intake_notes?: string;
  address?: string;
}

const DetailedAppointmentView = ({ isOpen, onClose, appointment }: DetailedAppointmentViewProps) => {
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLeadDetails();
    }
  }, [isOpen, appointment.id]);

  const loadLeadDetails = async () => {
    setLoading(true);
    try {
      const associatedLead = await findAssociatedLead(appointment);
      if (associatedLead) {
        setLeadDetails({
          contact_id: associatedLead.contact_id,
          phone_number: associatedLead.phone_number,
          email: associatedLead.email,
          lead_name: associatedLead.lead_name,
          project_name: associatedLead.project_name,
          insurance_provider: associatedLead.insurance_provider,
          insurance_plan: associatedLead.insurance_plan,
          insurance_id: associatedLead.insurance_id,
          insurance_id_link: associatedLead.insurance_id_link,
          group_number: associatedLead.group_number,
          patient_intake_notes: associatedLead.patient_intake_notes,
          
        });
      }
    } catch (error) {
      console.error('Error loading lead details:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasInsuranceInfo = () => {
    const appointmentInsurance = appointment.parsed_insurance_info?.provider || 
                                appointment.detected_insurance_provider ||
                                appointment.parsed_insurance_info?.plan ||
                                appointment.parsed_insurance_info?.id ||
                                appointment.parsed_insurance_info?.group_number;
    
    const leadInsurance = leadDetails?.insurance_provider ||
                         leadDetails?.insurance_plan ||
                         leadDetails?.insurance_id ||
                         leadDetails?.group_number;
    
    return appointmentInsurance || leadInsurance;
  };

  const getInsuranceData = () => {
    return {
      insurance_provider: leadDetails?.insurance_provider || appointment.parsed_insurance_info?.provider || appointment.detected_insurance_provider,
      insurance_plan: leadDetails?.insurance_plan || appointment.parsed_insurance_info?.plan || appointment.detected_insurance_plan,
      insurance_id: leadDetails?.insurance_id || appointment.parsed_insurance_info?.id || appointment.detected_insurance_id,
      insurance_id_link: leadDetails?.insurance_id_link || appointment.insurance_id_link,
      group_number: leadDetails?.group_number || appointment.parsed_insurance_info?.group_number
    };
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Appointment Details - {appointment.lead_name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Appointment Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Appointment Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Patient:</span>
                      <span>{appointment.lead_name}</span>
                    </div>
                    
                    {(appointment.lead_phone_number || leadDetails?.phone_number) && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Phone:</span>
                        <span>{appointment.lead_phone_number || leadDetails?.phone_number}</span>
                      </div>
                    )}
                    
                    {(appointment.lead_email || leadDetails?.email) && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Email:</span>
                        <span>{appointment.lead_email || leadDetails?.email}</span>
                      </div>
                    )}

                    {appointment.project_name && (
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Project:</span>
                        <span>{appointment.project_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {appointment.date_of_appointment && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Date:</span>
                        <span>{formatDate(appointment.date_of_appointment)}</span>
                      </div>
                    )}
                    
                    {appointment.requested_time && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Time:</span>
                        <span>{formatTime(appointment.requested_time)}</span>
                      </div>
                    )}

                    {appointment.status && (
                      <div className="flex items-center space-x-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Status:</span>
                        <Badge variant="outline">{appointment.status}</Badge>
                      </div>
                    )}

                    {appointment.agent && (
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Agent:</span>
                        <span>{appointment.agent}</span>
                      </div>
                    )}
                  </div>
                </div>

                {hasInsuranceInfo() && (
                  <div className="pt-2">
                    <Button
                      onClick={() => setShowInsuranceModal(true)}
                      variant="outline"
                      className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                    >
                      <Shield className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="text-blue-600">View Insurance Information</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Patient Intake Notes */}
            {(appointment.patient_intake_notes || leadDetails?.patient_intake_notes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Patient Intake Notes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border">
                      {appointment.patient_intake_notes || leadDetails?.patient_intake_notes}
                    </div>
                  </div>
                  
                  {/* AI Summary if available */}
                  {appointment.ai_summary && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center space-x-1">
                        <span>AI Summary</span>
                        <Badge variant="secondary" className="text-xs">AI</Badge>
                      </h4>
                      <div className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-200">
                        {appointment.ai_summary}
                      </div>
                    </div>
                  )}

                  {/* Parsed Information */}
                  {appointment.parsing_completed_at && (
                    <div className="mt-4">
                      <ParsedIntakeInfo 
                        parsedInsuranceInfo={appointment.parsed_insurance_info}
                        parsedPathologyInfo={appointment.parsed_pathology_info}
                        parsedContactInfo={appointment.parsed_contact_info}
                        parsedDemographics={appointment.parsed_demographics}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Internal Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <AppointmentNotes
                  appointmentId={appointment.id}
                  leadName={appointment.lead_name}
                  projectName={appointment.project_name}
                />
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insurance Modal */}
      <InsuranceViewModal
        isOpen={showInsuranceModal}
        onClose={() => setShowInsuranceModal(false)}
        insuranceInfo={getInsuranceData()}
        patientName={appointment.lead_name}
        patientPhone={appointment.lead_phone_number || leadDetails?.phone_number}
      />
    </>
  );
};

export default DetailedAppointmentView;