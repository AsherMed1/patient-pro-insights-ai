import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Hash,
  Printer,
  Download
} from 'lucide-react';
import { AllAppointment } from './types';
import { formatDate, formatTime } from './utils';
import AppointmentNotes from './AppointmentNotes';
import { ParsedIntakeInfo } from './ParsedIntakeInfo';
import InsuranceViewModal from '@/components/InsuranceViewModal';
import { findAssociatedLead, hasInsuranceInfo as hasInsuranceInfoUtil } from "@/utils/appointmentLeadMatcher";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DetailedAppointmentViewProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AllAppointment;
  onDataRefresh?: () => void;
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

const DetailedAppointmentView = ({ isOpen, onClose, appointment, onDataRefresh }: DetailedAppointmentViewProps) => {
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFetchingGHLData, setIsFetchingGHLData] = useState(false);

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

  const handleFetchGHLData = async () => {
    if (!appointment.ghl_appointment_id) {
      toast.error("No GHL appointment ID found");
      return;
    }

    setIsFetchingGHLData(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-ghl-contact-data', {
        body: { appointmentId: appointment.id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Added ${data.fieldsCount} GHL fields to Patient Intake Notes`);
        
        if (data.contactIdWasUpdated) {
          toast.success("Contact ID updated in database");
        }

        // Close modal and refresh data
        onClose();
        onDataRefresh?.();
      }
    } catch (error) {
      console.error('Error fetching GHL data:', error);
      toast.error("Failed to fetch GHL contact data");
    } finally {
      setIsFetchingGHLData(false);
    }
  };

  const hasInsuranceInfo = () => {
    const appointmentInsurance = appointment.parsed_insurance_info?.provider || 
                                appointment.detected_insurance_provider ||
                                appointment.parsed_insurance_info?.plan ||
                                appointment.parsed_insurance_info?.id ||
                                appointment.parsed_insurance_info?.group_number ||
                                appointment.insurance_id_link;
    
    const leadInsurance = leadDetails?.insurance_provider ||
                         leadDetails?.insurance_plan ||
                         leadDetails?.insurance_id ||
                         leadDetails?.group_number ||
                         leadDetails?.insurance_id_link;
    
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

  const extractAddressFromNotes = (notes: string): string | null => {
    if (!notes) return null;
    
    // Common address patterns
    const patterns = [
      // Full address pattern: number street, city, state zip
      /(\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Place|Pl|Way|Parkway|Pkwy)[A-Za-z0-9\s,.-]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/gi,
      // Address with city, state zip
      /([A-Za-z0-9\s,.-]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/gi,
      // Street address only
      /(\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Place|Pl|Way|Parkway|Pkwy))/gi
    ];
    
    for (const pattern of patterns) {
      const matches = notes.match(pattern);
      if (matches && matches.length > 0) {
        // Return the longest match (most complete address)
        return matches.reduce((longest, current) => 
          current.length > longest.length ? current : longest
        ).trim();
      }
    }
    
    return null;
  };

  const getPatientAddress = (): string | null => {
    // First try to get from parsed contact info
    if (appointment.parsed_contact_info?.address) {
      return appointment.parsed_contact_info.address;
    }
    
    // Then try to extract from raw notes if available
    const intakeNotes = appointment.patient_intake_notes || leadDetails?.patient_intake_notes;
    if (intakeNotes) {
      return extractAddressFromNotes(intakeNotes);
    }
    
    return null;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          /* Hide everything except the dialog content we want to print */
          body > *:not(.print-dialog) { display: none !important; }

          /* Reset dialog content to normal document flow for printing */
          .print-dialog {
            position: static !important;
            inset: auto !important;
            transform: none !important;
            width: auto !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: transparent !important;
          }
          
          .print-content {
            width: 100%;
            max-width: 100%;
            padding: 20px;
          }
          
          .no-print { display: none !important; }
          
          .print-page-break { page-break-before: always; }
          
          .print-card { break-inside: avoid; margin-bottom: 20px; }
          
          h1, h2, h3, h4, p, span, div { color: #000 !important; }
          
          .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          
          .print-section { margin-bottom: 25px; }
          
          .print-section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        }
      `}</style>
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="print-dialog max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Appointment Details - {appointment.lead_name}</span>
              </DialogTitle>
              <div className="flex gap-2 no-print">
                {appointment.ghl_appointment_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFetchGHLData}
                    disabled={isFetchingGHLData}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {isFetchingGHLData ? "Fetching..." : "Fetch GHL Data"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print / PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 print-content">
            {/* Print Header */}
            <div className="print-header hidden print:block">
              <h1 className="text-2xl font-bold">Patient Information</h1>
              <p className="text-sm text-muted-foreground">
                {appointment.project_name} - Generated on {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Appointment Overview */}
            <Card className="print-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Appointment Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TooltipProvider>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2 cursor-default">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{appointment.lead_name}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Patient Name</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      {(appointment.lead_phone_number || leadDetails?.phone_number) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 cursor-default">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{appointment.lead_phone_number || leadDetails?.phone_number}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Phone Number</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {(appointment.lead_email || leadDetails?.email) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 cursor-default">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{appointment.lead_email || leadDetails?.email}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Email Address</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {getPatientAddress() && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 cursor-default">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{getPatientAddress()}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Address</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {appointment.project_name && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 cursor-default">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span>{appointment.project_name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Project</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    <div className="space-y-3">
                      {appointment.date_of_appointment && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 cursor-default">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(appointment.date_of_appointment)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Appointment Date</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {appointment.requested_time && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 cursor-default">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatTime(appointment.requested_time)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Time</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {appointment.status && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 cursor-default">
                              <Hash className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline">{appointment.status}</Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Status</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {appointment.agent && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 cursor-default">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{appointment.agent}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Agent</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </TooltipProvider>

                {hasInsuranceInfo() && (
                  <>
                    <div className="pt-2 no-print">
                      <Button
                        onClick={() => setShowInsuranceModal(true)}
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                      >
                        <Shield className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-blue-600">View Insurance Information</span>
                      </Button>
                    </div>
                    
                    {/* Insurance info for print */}
                    <div className="hidden print:block print-section mt-4">
                      <div className="print-section-title">Insurance Information</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {getInsuranceData().insurance_provider && (
                          <div>
                            <span className="font-medium">Provider:</span> {getInsuranceData().insurance_provider}
                          </div>
                        )}
                        {getInsuranceData().insurance_plan && (
                          <div>
                            <span className="font-medium">Plan:</span> {getInsuranceData().insurance_plan}
                          </div>
                        )}
                        {getInsuranceData().insurance_id && (
                          <div>
                            <span className="font-medium">ID:</span> {getInsuranceData().insurance_id}
                          </div>
                        )}
                        {getInsuranceData().group_number && (
                          <div>
                            <span className="font-medium">Group:</span> {getInsuranceData().group_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Patient Intake Notes */}
            {(appointment.patient_intake_notes || leadDetails?.patient_intake_notes) && (
              <Card className="print-card">
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
                        parsedMedicalInfo={appointment.parsed_medical_info}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Internal Notes */}
            <Card className="print-card">
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
        patientDob={appointment.dob || (appointment as any).parsed_contact_info?.dob || (appointment as any).parsed_demographics?.dob || undefined}
      />
    </>
  );
};

export default DetailedAppointmentView;