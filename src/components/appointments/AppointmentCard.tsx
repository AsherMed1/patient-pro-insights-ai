import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar as CalendarIcon, User, Building, Phone, Mail, Clock, Info, Sparkles, Loader2, Shield, RefreshCw, ChevronDown } from 'lucide-react';
import { AllAppointment } from './types';
import { formatDate, formatTime, getAppointmentStatus, getProcedureOrderedVariant, getStatusOptions } from './utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import LeadDetailsModal from '@/components/LeadDetailsModal';
import AppointmentNotes from './AppointmentNotes';
import { ParsedIntakeInfo } from './ParsedIntakeInfo';
import InsuranceViewModal from '@/components/InsuranceViewModal';
interface AppointmentCardProps {
  appointment: AllAppointment;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
}
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
const AppointmentCard = ({
  appointment,
  projectFilter,
  onUpdateStatus,
  onUpdateProcedure
}: AppointmentCardProps) => {
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [leadData, setLeadData] = useState<NewLead | null>(null);
  const [loadingLeadData, setLoadingLeadData] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [showInsurance, setShowInsurance] = useState(false);
  const [leadInsuranceData, setLeadInsuranceData] = useState<NewLead | null>(null);
  const [hasLeadInsurance, setHasLeadInsurance] = useState(false);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const {
    toast
  } = useToast();
  const appointmentStatus = getAppointmentStatus(appointment);

  // Check if status has been updated (primary indicator)
  const isStatusUpdated = appointment.status && appointment.status.trim() !== '';
  const isProcedureUpdated = appointment.procedure_ordered !== null && appointment.procedure_ordered !== undefined;

  // Get styling classes for dropdowns
  const getStatusTriggerClass = () => {
    if (!projectFilter) return "w-full h-11 md:h-10 text-base md:text-sm";
    const baseClass = "w-full h-11 md:h-10 text-base md:text-sm";
    if (isStatusUpdated) {
      return `${baseClass} bg-green-50 border-green-200 hover:bg-green-100`;
    } else {
      return `${baseClass} bg-red-50 border-red-200 hover:bg-red-100`;
    }
  };
  const getProcedureTriggerClass = () => {
    if (!projectFilter) return "w-full h-11 md:h-10 text-base md:text-sm";
    const baseClass = "w-full h-11 md:h-10 text-base md:text-sm";
    if (isProcedureUpdated) {
      return `${baseClass} bg-green-50 border-green-200 hover:bg-green-100`;
    } else {
      return `${baseClass} bg-red-50 border-red-200 hover:bg-red-100`;
    }
  };

  // Check for lead insurance information on component mount
  useEffect(() => {
    const checkLeadInsurance = async () => {
      try {
        let leadRecord: NewLead | null = null;

        // Strategy 1: Match by lead_name and project_name
        if (appointment.lead_name && appointment.project_name) {
          const { data: nameProjectResults, error: nameProjectError } = await supabase
            .from('new_leads')
            .select('insurance_provider, insurance_plan, insurance_id, group_number')
            .eq('lead_name', appointment.lead_name)
            .eq('project_name', appointment.project_name)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (!nameProjectError && nameProjectResults && nameProjectResults.length > 0) {
            leadRecord = nameProjectResults[0] as NewLead;
          }
        }

        // Strategy 2: Try phone number if name+project didn't work
        if (!leadRecord && appointment.lead_phone_number) {
          const { data: phoneResults, error: phoneError } = await supabase
            .from('new_leads')
            .select('insurance_provider, insurance_plan, insurance_id, group_number')
            .eq('phone_number', appointment.lead_phone_number)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (!phoneError && phoneResults && phoneResults.length > 0) {
            leadRecord = phoneResults[0] as NewLead;
          }
        }

        // Strategy 3: Try GHL ID
        if (!leadRecord && appointment.ghl_id) {
          const { data: ghlResults, error: ghlError } = await supabase
            .from('new_leads')
            .select('insurance_provider, insurance_plan, insurance_id, group_number')
            .eq('contact_id', appointment.ghl_id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (!ghlError && ghlResults && ghlResults.length > 0) {
            leadRecord = ghlResults[0] as NewLead;
          }
        }

        // Check if lead has insurance info
        if (leadRecord) {
          const hasInsurance = leadRecord.insurance_provider || 
                              leadRecord.insurance_plan || 
                              leadRecord.insurance_id || 
                              leadRecord.group_number;
          setHasLeadInsurance(!!hasInsurance);
          console.log('Lead insurance check:', { leadRecord, hasInsurance });
        }
      } catch (error) {
        console.error('Error checking lead insurance:', error);
      }
    };

    checkLeadInsurance();
  }, [appointment.lead_name, appointment.project_name, appointment.lead_phone_number, appointment.ghl_id]);

  // Fetch status options on component mount
  useEffect(() => {
    const fetchStatusOptions = async () => {
      const statuses = await getStatusOptions();
      setStatusOptions(statuses);
    };
    
    fetchStatusOptions();
  }, []);
  const handleViewDetails = async () => {
    try {
      setLoadingLeadData(true);
      let leadRecord: NewLead | null = null;

      // Strategy 1: Match by lead_name and project_name (most specific)
      if (appointment.lead_name && appointment.project_name) {
        console.log('Trying strategy 1: name + project');
        const {
          data: nameProjectResults,
          error: nameProjectError
        } = await supabase.from('new_leads').select('*').eq('lead_name', appointment.lead_name).eq('project_name', appointment.project_name).order('created_at', {
          ascending: false
        }).limit(1);
        if (!nameProjectError && nameProjectResults && nameProjectResults.length > 0) {
          leadRecord = nameProjectResults[0];
          console.log('Found lead by name + project');
        }
      }

      // Strategy 2: If no results, try phone number matching
      if (!leadRecord && appointment.lead_phone_number) {
        console.log('Trying strategy 2: phone number');
        const {
          data: phoneResults,
          error: phoneError
        } = await supabase.from('new_leads').select('*').eq('phone_number', appointment.lead_phone_number).order('created_at', {
          ascending: false
        }).limit(1);
        if (!phoneError && phoneResults && phoneResults.length > 0) {
          leadRecord = phoneResults[0];
          console.log('Found lead by phone number');
        }
      }

      // Strategy 3: If no results, try email matching
      if (!leadRecord && appointment.lead_email) {
        console.log('Trying strategy 3: email');
        const {
          data: emailResults,
          error: emailError
        } = await supabase.from('new_leads').select('*').eq('email', appointment.lead_email).order('created_at', {
          ascending: false
        }).limit(1);
        if (!emailError && emailResults && emailResults.length > 0) {
          leadRecord = emailResults[0];
          console.log('Found lead by email');
        }
      }

      // Strategy 4: If no results, try GHL ID matching (ghl_id in appointments maps to contact_id in leads)
      if (!leadRecord && appointment.ghl_id) {
        console.log('Trying strategy 4: GHL ID');
        const {
          data: ghlResults,
          error: ghlError
        } = await supabase.from('new_leads').select('*').eq('contact_id', appointment.ghl_id).order('created_at', {
          ascending: false
        }).limit(1);
        if (!ghlError && ghlResults && ghlResults.length > 0) {
          leadRecord = ghlResults[0];
          console.log('Found lead by GHL ID');
        }
      }

      // Strategy 5: If still no results, try case-insensitive name search as fallback
      if (!leadRecord && appointment.lead_name) {
        console.log('Trying strategy 5: case-insensitive name search');
        const {
          data: ilikResults,
          error: ilikError
        } = await supabase.from('new_leads').select('*').ilike('lead_name', appointment.lead_name).eq('project_name', appointment.project_name).order('created_at', {
          ascending: false
        }).limit(1);
        if (!ilikError && ilikResults && ilikResults.length > 0) {
          leadRecord = ilikResults[0];
          console.log('Found lead by case-insensitive name search');
        }
      }
      if (leadRecord) {
        setLeadData(leadRecord);
        setShowLeadDetails(true);
      } else {
        toast({
          title: "No Additional Details",
          description: "No additional lead information found for this appointment.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error fetching lead details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lead details",
        variant: "destructive"
      });
    } finally {
      setLoadingLeadData(false);
    }
  };

  const handleViewInsurance = async () => {
    try {
      setLoadingLeadData(true);
      let leadRecord: NewLead | null = null;

      // Use the same strategies as handleViewDetails to find the lead
      if (appointment.lead_name && appointment.project_name) {
        const { data: nameProjectResults, error: nameProjectError } = await supabase
          .from('new_leads')
          .select('*')
          .eq('lead_name', appointment.lead_name)
          .eq('project_name', appointment.project_name)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!nameProjectError && nameProjectResults && nameProjectResults.length > 0) {
          leadRecord = nameProjectResults[0];
        }
      }

      if (!leadRecord && appointment.lead_phone_number) {
        const { data: phoneResults, error: phoneError } = await supabase
          .from('new_leads')
          .select('*')
          .eq('phone_number', appointment.lead_phone_number)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!phoneError && phoneResults && phoneResults.length > 0) {
          leadRecord = phoneResults[0];
        }
      }

      if (!leadRecord && appointment.ghl_id) {
        const { data: ghlResults, error: ghlError } = await supabase
          .from('new_leads')
          .select('*')
          .eq('contact_id', appointment.ghl_id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!ghlError && ghlResults && ghlResults.length > 0) {
          leadRecord = ghlResults[0];
        }
      }

      if (leadRecord) {
        setLeadInsuranceData(leadRecord);
        setShowInsurance(true);
      } else {
        toast({
          title: "No Insurance Information",
          description: "No insurance information found for this appointment.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error fetching insurance details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch insurance details",
        variant: "destructive"
      });
    } finally {
      setLoadingLeadData(false);
    }
  };

  // Check if there's insurance info available (from appointment parsed data or lead data)
  const hasInsuranceInfo = () => {
    // Check appointment's parsed insurance info first
    const appointmentInsurance = appointment.parsed_insurance_info?.provider || 
                                appointment.detected_insurance_provider ||
                                appointment.parsed_insurance_info?.plan ||
                                appointment.parsed_insurance_info?.id ||
                                appointment.parsed_insurance_info?.group_number;
    
    // Also check if we found lead insurance data
    return appointmentInsurance || hasLeadInsurance;
  };

  const getInsuranceData = () => {
    if (leadInsuranceData) {
      return {
        insurance_provider: leadInsuranceData.insurance_provider,
        insurance_plan: leadInsuranceData.insurance_plan,
        insurance_id: leadInsuranceData.insurance_id,
        group_number: leadInsuranceData.group_number
      };
    }
    
    // Fallback to appointment parsed data
    return {
      insurance_provider: appointment.parsed_insurance_info?.provider || appointment.detected_insurance_provider,
      insurance_plan: appointment.parsed_insurance_info?.plan || appointment.detected_insurance_plan,
      insurance_id: appointment.parsed_insurance_info?.id || appointment.detected_insurance_id,
      group_number: appointment.parsed_insurance_info?.group_number
    };
  };
  return <>
      <div className="border rounded-lg p-3 md:p-4 space-y-3 bg-white shadow-sm">
        <div className="space-y-2">
          {/* Lead Name - Prominent on mobile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-base md:text-sm break-words">{appointment.lead_name}</span>
            </div>
            <div className="flex flex-col items-end space-y-1 ml-2">
              <Button variant="outline" size="sm" onClick={handleViewDetails} disabled={loadingLeadData} className="flex items-center space-x-1">
                <Info className="h-3 w-3" />
                <span className="hidden sm:inline">View Details</span>
              </Button>
              {hasInsuranceInfo() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewInsurance}
                  disabled={loadingLeadData}
                  className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  <Shield className="h-3 w-3 text-blue-600" />
                  <span className="text-blue-600 hidden sm:inline">View Insurance</span>
                  <span className="text-blue-600 sm:hidden">Insurance</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Project Name */}
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-600 break-words">{appointment.project_name}</span>
          </div>
          
          {/* Contact Info - Stacked on mobile */}
          {appointment.lead_email && <div className="flex items-start space-x-2">
              <Mail className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600 break-all">{appointment.lead_email}</span>
            </div>}
          
          {appointment.lead_phone_number && <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">{appointment.lead_phone_number}</span>
            </div>}
          
          {/* Date Info - More compact on mobile */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Created: {formatDate(appointment.date_appointment_created)}
              </span>
            </div>
            
            {appointment.date_of_appointment && <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  Appointment: {formatDate(appointment.date_of_appointment)}
                </span>
              </div>}
            
            {appointment.requested_time && <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  Time: {formatTime(appointment.requested_time)}
                </span>
              </div>}
          </div>
          
          {appointment.agent && <div className="text-sm text-gray-600">
            Agent: {appointment.agent} {appointment.agent_number && `(${appointment.agent_number})`}
            </div>}

          {/* Status */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Status:</span>
            <Badge variant={appointmentStatus.variant}>{appointmentStatus.text}</Badge>
          </div>

          {/* Insurance Information - Quick View */}
          {(() => {
            console.log('AppointmentCard - appointment.parsed_insurance_info:', appointment.parsed_insurance_info);
            console.log('AppointmentCard - appointment.detected_insurance_provider:', appointment.detected_insurance_provider);
            return null;
          })()}
          {(appointment.parsed_insurance_info?.provider || appointment.detected_insurance_provider) && (
            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Insurance:</span>
                <span className="text-sm font-medium text-blue-900">
                  {appointment.parsed_insurance_info?.provider || appointment.detected_insurance_provider}
                  {(appointment.parsed_insurance_info?.plan || appointment.detected_insurance_plan) && 
                    ` - ${appointment.parsed_insurance_info?.plan || appointment.detected_insurance_plan}`}
                </span>
              </div>
              {(appointment.parsed_insurance_info?.id || appointment.detected_insurance_id) && (
                <div className="text-xs text-blue-700 mt-1 font-medium">
                  ID: {appointment.parsed_insurance_info?.id || appointment.detected_insurance_id}
                </div>
              )}
            </div>
          )}

          {/* Patient Intake Notes - Collapsible */}
          {(appointment.ai_summary || appointment.patient_intake_notes) && (
            <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-between w-full p-0 h-auto font-medium text-gray-700">
                  <span className="text-sm">Patient Intake Notes</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${notesExpanded ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {appointment.ai_summary ? (
                  <div className="bg-green-50 p-2 rounded-md border-l-4 border-green-400">
                    <span className="text-xs font-medium text-muted-foreground">AI Formatted Notes:</span>
                    <div className="whitespace-pre-wrap text-sm text-gray-800 mt-1">{appointment.ai_summary}</div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-2 rounded-md border-l-4 border-yellow-400">
                    <span className="text-xs font-medium text-muted-foreground">Raw Notes (Processing...):</span>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{appointment.patient_intake_notes}</p>
                  </div>
                )}
                {appointment.ai_summary && appointment.patient_intake_notes && (
                  <div className="bg-gray-50 p-2 rounded-md border-l-4 border-gray-400">
                    <span className="text-xs font-medium text-muted-foreground">Original Raw Input:</span>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{appointment.patient_intake_notes}</p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Parsed Intake Information */}
          <ParsedIntakeInfo 
            parsedInsuranceInfo={appointment.parsed_insurance_info}
            parsedPathologyInfo={appointment.parsed_pathology_info}
            parsedContactInfo={appointment.parsed_contact_info}
            parsedDemographics={appointment.parsed_demographics}
            className="mt-3"
          />

          {/* Internal Notes */}
          <div className="space-y-2">
            <AppointmentNotes appointmentId={appointment.id} leadName={appointment.lead_name} projectName={appointment.project_name} />
          </div>

          {/* Status and Procedure Badges - Responsive layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
            
            
          </div>

          {/* Status Update Section - Better mobile layout */}
          {projectFilter && <div className="border-t pt-3 mt-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Status:</label>
                  <Select value={appointment.status?.toLowerCase().replace(/\s+/g, '') || undefined} onValueChange={value => onUpdateStatus(appointment.id, value)}>
                    <SelectTrigger className={getStatusTriggerClass()}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg z-50">
                      {statusOptions.map(status => <SelectItem key={status} value={status} className="text-base md:text-sm py-3 md:py-2">
                          {status === 'noshow' ? 'No Show' : status}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block">Procedure Ordered:</label>
                  <Select value={isProcedureUpdated ? appointment.procedure_ordered === true ? 'yes' : 'no' : ''} onValueChange={value => {
                if (value === 'yes' || value === 'no') {
                  onUpdateProcedure(appointment.id, value === 'yes');
                }
              }}>
                    <SelectTrigger className={getProcedureTriggerClass()}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes" className="text-base md:text-sm py-3 md:py-2">Yes</SelectItem>
                      <SelectItem value="no" className="text-base md:text-sm py-3 md:py-2">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>}
        </div>
      </div>

      <LeadDetailsModal isOpen={showLeadDetails} onClose={() => setShowLeadDetails(false)} lead={leadData} />
      
      <InsuranceViewModal
        isOpen={showInsurance}
        onClose={() => setShowInsurance(false)}
        insuranceInfo={getInsuranceData()}
        patientName={appointment.lead_name}
        patientPhone={appointment.lead_phone_number}
      />
    </>;
};
export default AppointmentCard;