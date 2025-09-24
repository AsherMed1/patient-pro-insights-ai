import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar as CalendarIcon, User, Building, Phone, Mail, Clock, Info, Sparkles, Loader2, Shield, RefreshCw, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { AllAppointment } from './types';
import { formatDate, formatTime, getAppointmentStatus, getProcedureOrderedVariant, getStatusOptions } from './utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import LeadDetailsModal from '@/components/LeadDetailsModal';
import AppointmentNotes from './AppointmentNotes';
import { ParsedIntakeInfo } from './ParsedIntakeInfo';
import InsuranceViewModal from '@/components/InsuranceViewModal';
import DetailedAppointmentView from './DetailedAppointmentView';
import { findAssociatedLead, hasInsuranceInfo as hasInsuranceInfoUtil, type LeadAssociation } from "@/utils/appointmentLeadMatcher";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format as formatDateFns } from "date-fns";
interface AppointmentCardProps {
  appointment: AllAppointment;
  projectFilter?: string;
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
  onUpdateDate: (appointmentId: string, date: string | null) => void;
  onUpdateTime: (appointmentId: string, time: string | null) => void;
  onUpdateInternalProcess?: (appointmentId: string, isComplete: boolean) => void;
  onUpdateDOB?: (appointmentId: string, dob: string | null) => void;
  onDelete?: (appointmentId: string) => void;
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
  insurance_id_link?: string;
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
  onUpdateProcedure,
  onUpdateDate,
  onUpdateTime,
  onUpdateInternalProcess,
  onUpdateDOB,
  onDelete
}: AppointmentCardProps) => {
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [leadData, setLeadData] = useState<NewLead | null>(null);
  const [loadingLeadData, setLoadingLeadData] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [showInsurance, setShowInsurance] = useState(false);
  const [leadInsuranceData, setLeadInsuranceData] = useState<NewLead | null>(null);
  const [hasLeadInsurance, setHasLeadInsurance] = useState(false);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const { toast } = useToast();
  const appointmentStatus = getAppointmentStatus(appointment);
  
  // Prefer top-level dob from API, fallback to parsed fields
  const dobDisplay = appointment.dob || appointment.parsed_contact_info?.dob || appointment.parsed_demographics?.dob || null;
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(appointment.date_of_appointment ? new Date(appointment.date_of_appointment) : undefined);
  const [timeValue, setTimeValue] = useState<string>(appointment.requested_time ? appointment.requested_time.slice(0,5) : '');
  const [selectedDOB, setSelectedDOB] = useState<Date | undefined>(dobDisplay ? new Date(dobDisplay) : undefined);
  
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

  // Check for lead insurance information on component mount using centralized logic
  useEffect(() => {
    const checkLeadInsurance = async () => {
      try {
        const associatedLead = await findAssociatedLead(appointment);
        setHasLeadInsurance(hasInsuranceInfoUtil(associatedLead));
        console.log('Lead insurance check:', { 
          leadRecord: associatedLead, 
          hasInsurance: hasInsuranceInfoUtil(associatedLead),
          matchStrategy: associatedLead?.match_strategy 
        });
      } catch (error) {
        console.error('Error checking lead insurance:', error);
      }
    };

    checkLeadInsurance();
  }, [appointment]);

  // Sync local date/time state when appointment prop changes
  useEffect(() => {
    setSelectedDate(appointment.date_of_appointment ? new Date(appointment.date_of_appointment) : undefined);
    setTimeValue(appointment.requested_time ? appointment.requested_time.slice(0,5) : '');
    setSelectedDOB(dobDisplay ? new Date(dobDisplay) : undefined);
  }, [appointment.date_of_appointment, appointment.requested_time, dobDisplay]);

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
      const associatedLead = await findAssociatedLead(appointment);

      if (associatedLead) {
        // Convert LeadAssociation to NewLead format
        const leadRecord: NewLead = {
          id: associatedLead.lead_id,
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
          // Default values for other required fields
          date: new Date().toISOString().split('T')[0],
          times_called: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Found lead by', associatedLead.match_strategy, ':', leadRecord);
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
      const associatedLead = await findAssociatedLead(appointment);

      if (associatedLead) {
        // Convert LeadAssociation to NewLead format
        const leadRecord: NewLead = {
          id: associatedLead.lead_id,
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
          // Default values for other required fields
          date: new Date().toISOString().split('T')[0],
          times_called: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
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
        insurance_id_link: leadInsuranceData.insurance_id_link,
        group_number: leadInsuranceData.group_number
      };
    }
    
    // Fallback to appointment parsed data
    return {
      insurance_provider: appointment.parsed_insurance_info?.provider || appointment.detected_insurance_provider,
      insurance_plan: appointment.parsed_insurance_info?.plan || appointment.detected_insurance_plan,
      insurance_id: appointment.parsed_insurance_info?.id || appointment.detected_insurance_id,
      insurance_id_link: appointment.insurance_id_link,
      group_number: appointment.parsed_insurance_info?.group_number
    };
  };

  return <>
      <div className={cn(
        "border rounded-lg p-3 md:p-4 space-y-3 shadow-sm transition-colors duration-300",
        projectFilter && appointment.internal_process_complete 
          ? "bg-green-50 border-green-200" 
          : "bg-white"
      )}>
        <div className="space-y-2">
          {/* Lead Name - Prominent on mobile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-base md:text-sm break-words">{appointment.lead_name}</span>
              {dobDisplay ? (
                <Badge variant="secondary" className="ml-2 flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  DOB: {dobDisplay}
                  {onUpdateDOB && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 p-0"
                          aria-label="Edit DOB"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDOB}
                          onSelect={(date) => {
                            setSelectedDOB(date);
                            onUpdateDOB(appointment.id, date ? formatDateFns(date, 'yyyy-MM-dd') : null);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </Badge>
              ) : (
                <Badge variant="destructive" className="ml-2 flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  DOB Missing
                  {onUpdateDOB && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 p-0 text-white hover:text-destructive-foreground"
                          aria-label="Add DOB"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDOB}
                          onSelect={(date) => {
                            setSelectedDOB(date);
                            onUpdateDOB(appointment.id, date ? formatDateFns(date, 'yyyy-MM-dd') : null);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </Badge>
              )}
            </div>
            <div className="flex flex-col items-end space-y-1 ml-2">
              <Button variant="outline" size="sm" onClick={() => setShowDetailedView(true)} className="flex items-center space-x-1">
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
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center space-x-1 bg-red-50 hover:bg-red-100 border-red-200 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the appointment for "{appointment.lead_name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => onDelete(appointment.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          
          {/* Project Name */}
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-600 break-words">{appointment.project_name}</span>
          </div>
          
          {/* Calendar Name */}
          {appointment.calendar_name && (
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600 break-words">{appointment.calendar_name}</span>
            </div>
          )}
          
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
            
            {appointment.date_of_appointment && (
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    Appointment: {formatDate(appointment.date_of_appointment)}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Edit appointment date"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          onUpdateDate(appointment.id, date ? formatDateFns(date, 'yyyy-MM-dd') : null);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            
            {appointment.requested_time && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    Time: {formatTime(appointment.requested_time)}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Edit appointment time"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <Input
                        type="time"
                        value={timeValue}
                        onChange={(e) => setTimeValue(e.target.value)}
                        onBlur={() => onUpdateTime(appointment.id, timeValue || null)}
                        className="h-9"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

          </div>
        </div>
        
        {/* Status and Badges */}
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant={appointmentStatus.variant}>
            {appointmentStatus.text}
          </Badge>
          
          {appointment.procedure_ordered !== null && (
            <Badge variant={getProcedureOrderedVariant(appointment.procedure_ordered)}>
              {appointment.procedure_ordered ? 'Procedure Ordered' : 'No Procedure'}
            </Badge>
          )}
          
          {appointment.agent && (
            <Badge variant="outline">
              Agent: {appointment.agent}
            </Badge>
          )}
        </div>
        
        {/* Status and Procedure Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Select 
              value={appointment.status || ''} 
              onValueChange={(value) => onUpdateStatus(appointment.id, value)}
            >
              <SelectTrigger className={getStatusTriggerClass()}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Procedure</label>
            <Select 
              value={appointment.procedure_ordered === null ? '' : appointment.procedure_ordered.toString()} 
              onValueChange={(value) => onUpdateProcedure(appointment.id, value === 'true')}
            >
              <SelectTrigger className={getProcedureTriggerClass()}>
                <SelectValue placeholder="Select procedure status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Procedure Ordered</SelectItem>
                <SelectItem value="false">No Procedure</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
        
        {/* Internal Process Complete Checkbox - Only in project portals */}
        {projectFilter && onUpdateInternalProcess && (
          <div className="border-t pt-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id={`internal-process-${appointment.id}`}
                checked={appointment.internal_process_complete || false}
                onCheckedChange={(checked) => onUpdateInternalProcess(appointment.id, checked as boolean)}
                className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              />
              <label 
                htmlFor={`internal-process-${appointment.id}`}
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Internal Process Complete
              </label>
            </div>
          </div>
        )}
        
        {/* AI Summary */}
        {appointment.ai_summary && (
          <div className="border-t pt-3">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">AI Summary</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {appointment.ai_summary}
            </p>
          </div>
        )}
        
        {/* Parsed Information */}
        <ParsedIntakeInfo 
          parsedInsuranceInfo={appointment.parsed_insurance_info}
          parsedPathologyInfo={appointment.parsed_pathology_info}
          parsedContactInfo={appointment.parsed_contact_info}
          parsedDemographics={appointment.parsed_demographics}
        />
        
        {/* Patient Intake Notes */}
        {appointment.patient_intake_notes && (
          <div className="border-t pt-3">
            <Collapsible 
              open={notesExpanded} 
              onOpenChange={setNotesExpanded}
            >
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-2 h-auto"
                >
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Patient Intake Notes
                    </span>
                  </div>
                  <ChevronDown 
                    className={`h-4 w-4 transition-transform ${
                      notesExpanded ? 'transform rotate-180' : ''
                    }`} 
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed p-3 bg-gray-50 rounded border">
                  {appointment.patient_intake_notes}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
        
        {/* Appointment Notes */}
        <AppointmentNotes 
          appointmentId={appointment.id}
          leadName={appointment.lead_name}
          projectName={appointment.project_name}
        />
      </div>
      
      {/* Modals */}
      {showLeadDetails && leadData && (
        <LeadDetailsModal
          isOpen={showLeadDetails}
          onClose={() => setShowLeadDetails(false)}
          lead={leadData}
        />
      )}
      
      {showInsurance && leadInsuranceData && (
        <InsuranceViewModal
          isOpen={showInsurance}
          onClose={() => setShowInsurance(false)}
          insuranceInfo={getInsuranceData()}
          patientName={appointment.lead_name}
          patientPhone={appointment.lead_phone_number}
        />
      )}
      
      <DetailedAppointmentView
        isOpen={showDetailedView}
        onClose={() => setShowDetailedView(false)}
        appointment={appointment}
      />
    </>;
};

export default AppointmentCard;