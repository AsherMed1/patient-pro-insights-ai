import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar as CalendarIcon, User, Building, Phone, Mail, Clock, Info, Sparkles, Loader2, Shield, RefreshCw, ChevronDown, Pencil, Trash2, ExternalLink, CalendarDays, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import { AllAppointment } from './types';
import { formatDate, formatDateTime, formatTime, getAppointmentStatus, getProcedureOrderedVariant, getStatusOptions } from './utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import LeadDetailsModal from '@/components/LeadDetailsModal';
import AppointmentNotes from './AppointmentNotes';
import { ParsedIntakeInfo } from './ParsedIntakeInfo';
import InsuranceViewModal from '@/components/InsuranceViewModal';
import DetailedAppointmentView from './DetailedAppointmentView';
import { findAssociatedLead, hasInsuranceInfo as hasInsuranceInfoUtil, type LeadAssociation } from "@/utils/appointmentLeadMatcher";
import { Calendar } from "@/components/ui/calendar";
import { DOBPicker } from "@/components/ui/dob-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format as formatDateFns } from "date-fns";
import { useGhlCalendars } from "@/hooks/useGhlCalendars";
interface AppointmentCardProps {
  appointment: AllAppointment;
  projectFilter?: string;
  statusOptions: string[];
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureOrdered: boolean) => void;
  onUpdateDate: (appointmentId: string, date: string | null) => void;
  onUpdateTime: (appointmentId: string, time: string | null) => void;
  onUpdateInternalProcess?: (appointmentId: string, isComplete: boolean) => void;
  onUpdateDOB?: (appointmentId: string, dob: string | null) => void;
  onDelete?: (appointmentId: string) => void;
  onUpdateName?: (appointmentId: string, name: string) => void;
  onUpdateEmail?: (appointmentId: string, email: string) => void;
  onUpdatePhone?: (appointmentId: string, phone: string) => void;
  onUpdateCalendarLocation?: (appointmentId: string, location: string) => void;
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
  statusOptions,
  onUpdateStatus,
  onUpdateProcedure,
  onUpdateDate,
  onUpdateTime,
  onUpdateInternalProcess,
  onUpdateDOB,
  onDelete,
  onUpdateName,
  onUpdateEmail,
  onUpdatePhone,
  onUpdateCalendarLocation
}: AppointmentCardProps) => {
  const { hasManagementAccess, isAdmin } = useRole();
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [leadData, setLeadData] = useState<NewLead | null>(null);
  const [loadingLeadData, setLoadingLeadData] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [showInsurance, setShowInsurance] = useState(false);
  const [leadInsuranceData, setLeadInsuranceData] = useState<NewLead | null>(null);
  const [hasLeadInsurance, setHasLeadInsurance] = useState(false);
  const [leadDOB, setLeadDOB] = useState<string | null>(null);
  const { toast } = useToast();
  const appointmentStatus = getAppointmentStatus(appointment);
  
  // Prefer top-level dob from API, fallback to parsed fields or associated lead
  const dobDisplay = appointment.dob || (appointment as any).parsed_contact_info?.dob || (appointment as any).parsed_demographics?.dob || leadDOB || null;
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(appointment.date_of_appointment ? new Date(appointment.date_of_appointment) : undefined);
  const [timeValue, setTimeValue] = useState<string>(appointment.requested_time ? appointment.requested_time.slice(0,5) : '');
  const [selectedDOB, setSelectedDOB] = useState<Date | undefined>(dobDisplay ? new Date(dobDisplay) : undefined);
  
  // Editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(appointment.lead_name);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editingEmail, setEditingEmail] = useState(appointment.lead_email || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editingPhone, setEditingPhone] = useState(appointment.lead_phone_number || '');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState(appointment.calendar_name || '');
  
  // GHL calendar dropdown states
  const { calendars, loading: loadingCalendars, fetchCalendars, transferToCalendar } = useGhlCalendars();
  const [projectGhlCredentials, setProjectGhlCredentials] = useState<{ ghl_location_id: string | null; ghl_api_key: string | null }>({ ghl_location_id: null, ghl_api_key: null });
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const [transferringCalendar, setTransferringCalendar] = useState(false);
  
  // Reschedule dialog states
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [retryingGhlSync, setRetryingGhlSync] = useState(false);
  const [projectTimezone, setProjectTimezone] = useState<string>('America/Chicago');
  
  // Check if status has been updated (primary indicator)
  const isStatusUpdated = appointment.status && appointment.status.trim() !== '';
  const isProcedureUpdated = appointment.procedure_ordered !== null && appointment.procedure_ordered !== undefined;

  // Get styling classes for dropdowns
  const getStatusTriggerClass = () => {
    if (!projectFilter) return "w-full h-11 md:h-10 text-base md:text-sm";
    const baseClass = "w-full h-11 md:h-10 text-base md:text-sm";

    const normalized = appointment.status?.toLowerCase().trim();
    if (!normalized) {
      // Not updated yet
      return `${baseClass} bg-red-50 border-red-200 hover:bg-red-100`;
    }

    switch (normalized) {
      case 'showed':
      case 'won':
        return `${baseClass} bg-green-50 border-green-200 hover:bg-green-100`;
      case 'no show':
      case 'noshow':
        return `${baseClass} bg-yellow-50 border-yellow-200 hover:bg-yellow-100`;
      case 'cancelled':
      case 'canceled':
        return `${baseClass} bg-red-50 border-red-200 hover:bg-red-100`;
      case 'rescheduled':
        return `${baseClass} bg-purple-50 border-purple-200 hover:bg-purple-100`;
      case 'oon':
        return `${baseClass} bg-orange-50 border-orange-200 hover:bg-orange-100`;
      case 'confirmed':
        return `${baseClass} bg-blue-50 border-blue-200 hover:bg-blue-100`;
      case 'welcome call':
        return `${baseClass} bg-gray-100 border-gray-300 hover:bg-gray-100`;
      default:
        return baseClass;
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

  // Check for lead insurance and DOB information on component mount using centralized logic
  useEffect(() => {
    const checkLeadData = async () => {
      try {
        const associatedLead = await findAssociatedLead(appointment);
        setHasLeadInsurance(hasInsuranceInfoUtil(associatedLead));
        console.log(`[${appointment.lead_name}] Lead Association Check:`, { 
          appointmentId: appointment.id,
          appointmentGhlId: appointment.ghl_id,
          appointmentPhone: appointment.lead_phone_number,
          appointmentEmail: appointment.lead_email,
          leadRecord: associatedLead,
          insurance_id_link: associatedLead?.insurance_id_link,
          insurance_provider: associatedLead?.insurance_provider,
          insurance_plan: associatedLead?.insurance_plan,
          insurance_id: associatedLead?.insurance_id,
          group_number: associatedLead?.group_number,
          hasInsurance: hasInsuranceInfoUtil(associatedLead),
          hasDOB: !!associatedLead?.dob,
          matchStrategy: associatedLead?.match_strategy 
        });

        // Pull DOB directly from the lead association
        if (associatedLead?.dob) {
          setLeadDOB(associatedLead.dob);
          // Persist to appointment if not already set
          if (!appointment.dob) {
            await supabase
              .from('all_appointments')
              .update({ dob: associatedLead.dob, updated_at: new Date().toISOString() })
              .eq('id', appointment.id);
          }
        }
      } catch (error) {
        console.error('Error checking lead data:', error);
      }
    };

    checkLeadData();
  }, [appointment]);

  // Fetch project GHL credentials for calendar dropdown
  useEffect(() => {
    const fetchProjectCredentials = async () => {
      if (!appointment.project_name) return;
      
      const { data } = await supabase
        .from('projects')
        .select('ghl_location_id, ghl_api_key')
        .eq('project_name', appointment.project_name)
        .single();
      
      if (data) {
        setProjectGhlCredentials({
          ghl_location_id: data.ghl_location_id,
          ghl_api_key: data.ghl_api_key
        });
      }
    };
    
    fetchProjectCredentials();
  }, [appointment.project_name]);

  // Fetch calendars when dropdown opens
  useEffect(() => {
    if (calendarDropdownOpen && projectGhlCredentials.ghl_location_id && calendars.length === 0) {
      fetchCalendars(projectGhlCredentials.ghl_location_id, projectGhlCredentials.ghl_api_key || undefined);
    }
  }, [calendarDropdownOpen, projectGhlCredentials, calendars.length, fetchCalendars]);

  // Extract location from calendar name (e.g., "Request your PAE Consultation at Miami, FL" -> "Miami, FL")
  const extractLocationFromCalendarName = (calendarName: string): string => {
    // Try "at Location" format first
    const atMatch = calendarName.match(/at\s+(.+)$/i);
    if (atMatch) return atMatch[1].trim();
    
    // Try "- Location" format
    const dashMatch = calendarName.match(/-\s*([^-]+)$/);
    if (dashMatch) return dashMatch[1].trim();
    
    return calendarName;
  };

  // Build appointment title from lead name and calendar name
  const buildAppointmentTitle = (calendarName: string): string => {
    const location = extractLocationFromCalendarName(calendarName);
    // Extract procedure type from calendar name (e.g., "PAE", "GAE", "UFE")
    const procedureMatch = calendarName.match(/\b(PAE|GAE|UFE|Consultation)\b/i);
    const procedure = procedureMatch ? procedureMatch[1].toUpperCase() : '';
    
    if (procedure && procedure !== 'CONSULTATION') {
      return `${appointment.lead_name} ${procedure} Consultation at ${location}`;
    }
    return `${appointment.lead_name} Consultation at ${location}`;
  };

  // Handle calendar selection and GHL sync
  const handleCalendarChange = async (calendarId: string) => {
    const selectedCalendar = calendars.find(c => c.id === calendarId);
    if (!selectedCalendar) return;
    
    const newCalendarName = selectedCalendar.name;
    const newTitle = buildAppointmentTitle(newCalendarName);
    setTransferringCalendar(true);
    
    try {
      // Update local database first
      const { error: dbError } = await supabase
        .from('all_appointments')
        .update({ 
          calendar_name: newCalendarName,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);
      
      if (dbError) throw dbError;
      
      // Sync to GHL if appointment has ghl_appointment_id
      if (appointment.ghl_appointment_id && projectGhlCredentials.ghl_api_key) {
        try {
          await transferToCalendar(
            appointment.ghl_appointment_id,
            calendarId,
            projectGhlCredentials.ghl_api_key,
            newTitle
          );
          
          toast({
            title: "Calendar Updated",
            description: `Appointment moved to ${newCalendarName} and synced to GoHighLevel`,
          });
        } catch (ghlError: any) {
          console.error('GHL sync failed:', ghlError);
          toast({
            title: "Partially Updated",
            description: `Calendar updated locally but GHL sync failed: ${ghlError.message}`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Calendar Updated",
          description: `Appointment moved to ${newCalendarName}`,
        });
      }
      
      // Call the parent callback to update local state
      if (onUpdateCalendarLocation) {
        onUpdateCalendarLocation(appointment.id, newCalendarName);
      }
      
    } catch (error: any) {
      console.error('Error updating calendar:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update calendar location",
        variant: "destructive"
      });
    } finally {
      setTransferringCalendar(false);
      setCalendarDropdownOpen(false);
    }
  };

  // Sync local date/time state when appointment prop changes
  useEffect(() => {
    setSelectedDate(appointment.date_of_appointment ? new Date(appointment.date_of_appointment) : undefined);
    setTimeValue(appointment.requested_time ? appointment.requested_time.slice(0,5) : '');
    setSelectedDOB(dobDisplay ? new Date(dobDisplay) : undefined);
    setEditingName(appointment.lead_name);
    setEditingEmail(appointment.lead_email || '');
    setEditingPhone(appointment.lead_phone_number || '');
    setEditingLocation(appointment.calendar_name || '');
  }, [appointment.date_of_appointment, appointment.requested_time, dobDisplay, appointment.lead_name, appointment.lead_email, appointment.lead_phone_number, appointment.calendar_name]);

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
    setLoadingLeadData(true);
    
    try {
      // ALWAYS fetch associated lead first to get complete data
      const associatedLead = await findAssociatedLead(appointment);
      
      // Merge appointment insurance data with lead data (APPOINTMENT takes priority)
      const mergedInsuranceData = {
        insurance_provider: appointment.parsed_insurance_info?.insurance_provider || 
                           appointment.parsed_insurance_info?.provider || 
                           appointment.detected_insurance_provider ||
                           associatedLead?.insurance_provider,
        insurance_plan: appointment.parsed_insurance_info?.insurance_plan || 
                       appointment.parsed_insurance_info?.plan || 
                       appointment.detected_insurance_plan ||
                       associatedLead?.insurance_plan,
        insurance_id: appointment.parsed_insurance_info?.insurance_id_number || 
                     appointment.parsed_insurance_info?.id || 
                     appointment.detected_insurance_id ||
                     associatedLead?.insurance_id,
        group_number: appointment.parsed_insurance_info?.insurance_group_number || 
                     appointment.parsed_insurance_info?.group_number ||
                     associatedLead?.group_number,
        insurance_id_link: appointment.insurance_id_link || 
                          associatedLead?.insurance_id_link
      };
      
      // Check if any insurance data exists
      const hasAnyInsurance = Object.values(mergedInsuranceData).some(val => !!val);
      
      console.log(`[${appointment.lead_name}] View Insurance - Merged Data:`, {
        associatedLeadFound: !!associatedLead,
        matchStrategy: associatedLead?.match_strategy,
        mergedData: mergedInsuranceData,
        hasAnyInsurance
      });
      
      if (hasAnyInsurance) {
        const leadRecord: NewLead = {
          id: associatedLead?.lead_id || appointment.id,
          lead_name: appointment.lead_name,
          project_name: appointment.project_name,
          contact_id: associatedLead?.contact_id || appointment.ghl_id,
          phone_number: associatedLead?.phone_number || appointment.lead_phone_number,
          email: associatedLead?.email || appointment.lead_email,
          ...mergedInsuranceData,
          patient_intake_notes: associatedLead?.patient_intake_notes || appointment.patient_intake_notes,
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
      console.error('Error loading insurance data:', error);
      toast({
        title: "Error",
        description: "Failed to load insurance information",
        variant: "destructive"
      });
    } finally {
      setLoadingLeadData(false);
    }
  };

  // Check if there's insurance info available (from appointment parsed data or lead data)
  const hasInsuranceInfo = () => {
    // Check appointment's parsed insurance info first
    const appointmentInsurance = 
      appointment.parsed_insurance_info?.insurance_provider ||
      appointment.parsed_insurance_info?.provider || 
      appointment.detected_insurance_provider ||
      appointment.parsed_insurance_info?.insurance_plan ||
      appointment.parsed_insurance_info?.plan ||
      appointment.parsed_insurance_info?.insurance_id_number ||
      appointment.parsed_insurance_info?.id ||
      appointment.parsed_insurance_info?.insurance_group_number ||
      appointment.parsed_insurance_info?.group_number ||
      appointment.insurance_id_link;
    
    // Also check if we found lead insurance data
    return appointmentInsurance || hasLeadInsurance;
  };

  const getInsuranceData = () => {
    // Merge appointment and lead data, prioritizing APPOINTMENT data (most recent/accurate)
    return {
      insurance_provider: appointment.parsed_insurance_info?.insurance_provider || 
                         appointment.parsed_insurance_info?.provider || 
                         appointment.detected_insurance_provider ||
                         leadInsuranceData?.insurance_provider,
      insurance_plan: appointment.parsed_insurance_info?.insurance_plan || 
                     appointment.parsed_insurance_info?.plan || 
                     appointment.detected_insurance_plan ||
                     leadInsuranceData?.insurance_plan,
      insurance_id: appointment.parsed_insurance_info?.insurance_id_number || 
                   appointment.parsed_insurance_info?.id || 
                   appointment.detected_insurance_id ||
                   leadInsuranceData?.insurance_id,
      insurance_id_link: appointment.insurance_id_link || 
                        leadInsuranceData?.insurance_id_link,
      group_number: appointment.parsed_insurance_info?.insurance_group_number || 
                   appointment.parsed_insurance_info?.group_number ||
                   leadInsuranceData?.group_number
    };
  };

  // Helper function to format timezone names
  const formatTimezoneName = (tz: string): string => {
    const timezoneMap: { [key: string]: string } = {
      'America/New_York': 'Eastern Time',
      'America/Chicago': 'Central Time',
      'America/Denver': 'Mountain Time',
      'America/Phoenix': 'Mountain Time (no DST)',
      'America/Los_Angeles': 'Pacific Time',
      'America/Louisville': 'Eastern Time',
      'America/Detroit': 'Eastern Time',
      'America/Indiana/Indianapolis': 'Eastern Time',
      'America/Kentucky/Louisville': 'Eastern Time',
      'US/Eastern': 'Eastern Time',
      'US/Central': 'Central Time',
      'US/Mountain': 'Mountain Time',
      'US/Pacific': 'Pacific Time',
    };
    
    return timezoneMap[tz] || tz;
  };

  // Handle status change - intercept "Rescheduled" to show dialog
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus.toLowerCase() === 'rescheduled') {
      // Fetch project timezone before showing dialog
      try {
        const { data: projectData, error } = await supabase
          .from('projects')
          .select('timezone')
          .eq('project_name', appointment.project_name)
          .single();
        
        if (!error && projectData?.timezone) {
          setProjectTimezone(projectData.timezone);
        }
      } catch (error) {
        console.error('Error fetching project timezone:', error);
      }
      
      setShowRescheduleDialog(true);
    } else {
      onUpdateStatus(appointment.id, newStatus);
    }
  };

  // Handle reschedule submission - call GHL directly
  const handleRescheduleSubmit = async () => {
    if (!rescheduleDate) {
      toast({
        title: "Error",
        description: "Please select a new date",
        variant: "destructive"
      });
      return;
    }

    setSubmittingReschedule(true);
    
    try {
      const newDate = formatDateFns(rescheduleDate, 'yyyy-MM-dd');
      const newTime = rescheduleTime || appointment.requested_time || '09:00';
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create reschedule record for tracking
      const { data: rescheduleRecord, error: rescheduleError } = await supabase
        .from('appointment_reschedules')
        .insert({
          appointment_id: appointment.id,
          project_name: appointment.project_name,
          lead_name: appointment.lead_name,
          lead_phone: appointment.lead_phone_number,
          lead_email: appointment.lead_email,
          original_date: appointment.date_of_appointment,
          original_time: appointment.requested_time,
          new_date: newDate,
          new_time: newTime,
          notes: rescheduleNotes || null,
          requested_by: user?.id,
          ghl_sync_status: 'pending'
        })
        .select()
        .single();
      
      if (rescheduleError) throw rescheduleError;
      
      // Update local appointment
      const { error: updateError } = await supabase
        .from('all_appointments')
        .update({
          date_of_appointment: newDate,
          requested_time: newTime,
          status: 'Rescheduled',
          last_ghl_sync_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);
      
      if (updateError) throw updateError;
      
      // Try to sync with GHL if we have the required data
      if (appointment.ghl_appointment_id) {
        try {
          // Fetch project data for timezone and location ID
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('timezone, ghl_location_id, ghl_api_key')
            .eq('project_name', appointment.project_name)
            .single();
          
          if (projectError) throw projectError;
          
          if (!projectData?.ghl_location_id) {
            throw new Error('GHL location ID not configured for this project');
          }
          
          // Call GHL update function
          const { error: ghlError } = await supabase.functions.invoke(
            'update-ghl-appointment',
            {
              body: {
                ghl_appointment_id: appointment.ghl_appointment_id,
                ghl_location_id: projectData.ghl_location_id,
                new_date: newDate,
                new_time: newTime,
                timezone: projectData.timezone || 'America/Chicago',
                ghl_api_key: projectData.ghl_api_key,
              },
            }
          );
          
          if (ghlError) throw ghlError;
          
          // Update sync status on success
          await supabase
            .from('all_appointments')
            .update({
              last_ghl_sync_status: 'success',
              last_ghl_sync_at: new Date().toISOString(),
              last_ghl_sync_error: null,
            })
            .eq('id', appointment.id);
          
          // Update reschedule record
          await supabase
            .from('appointment_reschedules')
            .update({
              ghl_sync_status: 'success',
              ghl_synced_at: new Date().toISOString(),
              processed: true,
              processed_by: user?.id,
              processed_at: new Date().toISOString()
            })
            .eq('id', rescheduleRecord.id);
          
          toast({
            title: "Success",
            description: "Appointment rescheduled in GoHighLevel successfully"
          });
          
        } catch (ghlError: any) {
          console.error('GHL sync error:', ghlError);
          
          // Log error but appointment was still updated locally
          await supabase
            .from('all_appointments')
            .update({
              last_ghl_sync_status: 'failed',
              last_ghl_sync_at: new Date().toISOString(),
              last_ghl_sync_error: ghlError.message || String(ghlError),
            })
            .eq('id', appointment.id);
          
          // Update reschedule record with error
          await supabase
            .from('appointment_reschedules')
            .update({
              ghl_sync_status: 'failed',
              ghl_sync_error: ghlError.message || String(ghlError),
              ghl_synced_at: new Date().toISOString()
            })
            .eq('id', rescheduleRecord.id);
          
          toast({
            title: "Partial Success",
            description: "Appointment updated locally but GHL sync failed. You can retry from the appointment card.",
            variant: "destructive"
          });
        }
      } else {
        // No GHL appointment ID - mark reschedule as processed locally only
        await supabase
          .from('all_appointments')
          .update({
            last_ghl_sync_status: null,
            last_ghl_sync_error: 'No GHL appointment ID',
          })
          .eq('id', appointment.id);
        
        // Update reschedule record
        await supabase
          .from('appointment_reschedules')
          .update({
            ghl_sync_status: 'skipped',
            ghl_sync_error: 'No GHL appointment ID',
            processed: true,
            processed_by: user?.id,
            processed_at: new Date().toISOString()
          })
          .eq('id', rescheduleRecord.id);
        
        toast({
          title: "Success",
          description: "Appointment rescheduled locally (not linked to GoHighLevel)"
        });
      }
      
      // Trigger parent update
      onUpdateStatus(appointment.id, 'Rescheduled');
      
      // Reset and close dialog
      setShowRescheduleDialog(false);
      setRescheduleDate(undefined);
      setRescheduleTime('');
      setRescheduleNotes('');
      
    } catch (error) {
      console.error('Error submitting reschedule:', error);
      toast({
        title: "Error",
        description: "Failed to reschedule appointment",
        variant: "destructive"
      });
    } finally {
      setSubmittingReschedule(false);
    }
  };

  // Retry GHL sync for failed appointments
  const handleRetryGhlSync = async () => {
    if (!appointment.ghl_appointment_id || !appointment.date_of_appointment) {
      toast({
        title: "Cannot Retry",
        description: "Missing GHL appointment ID or date",
        variant: "destructive"
      });
      return;
    }

    setRetryingGhlSync(true);
    
    try {
      const newTime = appointment.requested_time || '09:00';
      
      // Fetch project data for timezone and location ID
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('timezone, ghl_location_id, ghl_api_key')
        .eq('project_name', appointment.project_name)
        .single();
      
      if (projectError) throw projectError;
      
      if (!projectData?.ghl_location_id) {
        throw new Error('GHL location ID not configured for this project');
      }
      
      // Update status to pending
      await supabase
        .from('all_appointments')
        .update({ last_ghl_sync_status: 'pending' })
        .eq('id', appointment.id);
      
      // Call GHL update function
      const { error: ghlError } = await supabase.functions.invoke(
        'update-ghl-appointment',
        {
          body: {
            ghl_appointment_id: appointment.ghl_appointment_id,
            ghl_location_id: projectData.ghl_location_id,
            new_date: appointment.date_of_appointment,
            new_time: newTime,
            timezone: projectData.timezone || 'America/Chicago',
            ghl_api_key: projectData.ghl_api_key,
          },
        }
      );
      
      if (ghlError) throw ghlError;
      
      // Update sync status on success
      await supabase
        .from('all_appointments')
        .update({
          last_ghl_sync_status: 'success',
          last_ghl_sync_at: new Date().toISOString(),
          last_ghl_sync_error: null,
        })
        .eq('id', appointment.id);
      
      // Update any related reschedule records
      if (appointment.status?.toLowerCase() === 'rescheduled') {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from('appointment_reschedules')
          .update({
            ghl_sync_status: 'success',
            ghl_synced_at: new Date().toISOString(),
            ghl_sync_error: null,
            processed: true,
            processed_by: user?.id,
            processed_at: new Date().toISOString()
          })
          .eq('appointment_id', appointment.id)
          .eq('processed', false);
      }
      
      toast({
        title: "Success",
        description: "Appointment synced to GoHighLevel successfully"
      });
      
    } catch (error: any) {
      console.error('GHL retry error:', error);
      
      // Update with error
      await supabase
        .from('all_appointments')
        .update({
          last_ghl_sync_status: 'failed',
          last_ghl_sync_at: new Date().toISOString(),
          last_ghl_sync_error: error.message || String(error),
        })
        .eq('id', appointment.id);
      
      // Update any related reschedule records with error
      if (appointment.status?.toLowerCase() === 'rescheduled') {
        await supabase
          .from('appointment_reschedules')
          .update({
            ghl_sync_status: 'failed',
            ghl_sync_error: error.message || String(error),
            ghl_synced_at: new Date().toISOString()
          })
          .eq('appointment_id', appointment.id)
          .eq('processed', false);
      }
      
      toast({
        title: "Sync Failed",
        description: error.message || 'Failed to sync with GoHighLevel',
        variant: "destructive"
      });
    } finally {
      setRetryingGhlSync(false);
    }
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
              {isEditingName && onUpdateName ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => {
                    setIsEditingName(false);
                    if (editingName !== appointment.lead_name) {
                      onUpdateName(appointment.id, editingName);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingName(false);
                      if (editingName !== appointment.lead_name) {
                        onUpdateName(appointment.id, editingName);
                      }
                    }
                    if (e.key === 'Escape') {
                      setIsEditingName(false);
                      setEditingName(appointment.lead_name);
                    }
                  }}
                  className="font-medium text-base md:text-sm"
                  autoFocus
                />
              ) : (
                <>
                  <span className="font-medium text-base md:text-sm break-words">{appointment.lead_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">ID: {appointment.id.substring(0, 8)}</span>
                  {onUpdateName && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setIsEditingName(true)}
                      aria-label="Edit name"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </>
              )}
              {/* EMR Status Badge */}
              {appointment.status?.toLowerCase() === 'confirmed' && (
                appointment.internal_process_complete ? (
                  <Badge variant="showed" className="ml-2">✅ EMR Complete</Badge>
                ) : (
                  <Badge variant="oon" className="ml-2">⏱️ Pending EMR</Badge>
                )
              )}
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
                        <div className="p-3">
                          <DOBPicker
                            value={selectedDOB}
                            onChange={(date) => {
                              setSelectedDOB(date);
                              onUpdateDOB(appointment.id, date ? formatDateFns(date, 'yyyy-MM-dd') : null);
                            }}
                            placeholder="Select date of birth"
                          />
                        </div>
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
                        <div className="p-3">
                          <DOBPicker
                            value={selectedDOB}
                            onChange={(date) => {
                              setSelectedDOB(date);
                              onUpdateDOB(appointment.id, date ? formatDateFns(date, 'yyyy-MM-dd') : null);
                            }}
                            placeholder="Select date of birth"
                          />
                        </div>
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
              {isAdmin() && onDelete && (
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-2 cursor-default">
                  <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 break-words">{appointment.project_name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Project</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Calendar Name / Location Dropdown */}
          {(appointment.calendar_name || projectGhlCredentials.ghl_location_id) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    {projectGhlCredentials.ghl_location_id && onUpdateCalendarLocation ? (
                      <Select
                        open={calendarDropdownOpen}
                        onOpenChange={setCalendarDropdownOpen}
                        value=""
                        onValueChange={handleCalendarChange}
                      >
                        <SelectTrigger className="h-8 text-sm w-auto min-w-[200px] max-w-[350px]">
                          {transferringCalendar || loadingCalendars ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>{transferringCalendar ? 'Transferring...' : 'Loading...'}</span>
                            </div>
                          ) : (
                            <span className="truncate">{appointment.calendar_name || 'Select location'}</span>
                          )}
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50" align="start">
                          {calendars.length > 0 ? (
                            calendars.map((calendar) => (
                              <SelectItem 
                                key={calendar.id} 
                                value={calendar.id}
                                className={cn(
                                  "cursor-pointer",
                                  calendar.name === appointment.calendar_name && "bg-accent"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  {calendar.name === appointment.calendar_name && (
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  )}
                                  <span>{calendar.name}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                              {loadingCalendars ? 'Loading calendars...' : 'No calendars available'}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-gray-600 break-words">{appointment.calendar_name}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Location / Calendar {projectGhlCredentials.ghl_location_id ? '(Click to change)' : ''}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Contact Info - Stacked on mobile */}
          {(appointment.lead_email || isEditingEmail) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-start space-x-2">
                    <Mail className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    {isEditingEmail && onUpdateEmail ? (
                      <Input
                        type="email"
                        value={editingEmail}
                        onChange={(e) => setEditingEmail(e.target.value)}
                        onBlur={() => {
                          setIsEditingEmail(false);
                          if (editingEmail !== appointment.lead_email) {
                            onUpdateEmail(appointment.id, editingEmail);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingEmail(false);
                            if (editingEmail !== appointment.lead_email) {
                              onUpdateEmail(appointment.id, editingEmail);
                            }
                          }
                          if (e.key === 'Escape') {
                            setIsEditingEmail(false);
                            setEditingEmail(appointment.lead_email || '');
                          }
                        }}
                        className="text-sm flex-1"
                        autoFocus
                        placeholder="Enter email"
                      />
                    ) : (
                      <>
                        <span className="text-sm text-gray-600 break-all">{appointment.lead_email}</span>
                        {onUpdateEmail && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setIsEditingEmail(true)}
                            aria-label="Edit email"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Email Address</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {(appointment.lead_phone_number || isEditingPhone) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    {isEditingPhone && onUpdatePhone ? (
                      <Input
                        type="tel"
                        value={editingPhone}
                        onChange={(e) => setEditingPhone(e.target.value)}
                        onBlur={() => {
                          setIsEditingPhone(false);
                          if (editingPhone !== appointment.lead_phone_number) {
                            onUpdatePhone(appointment.id, editingPhone);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingPhone(false);
                            if (editingPhone !== appointment.lead_phone_number) {
                              onUpdatePhone(appointment.id, editingPhone);
                            }
                          }
                          if (e.key === 'Escape') {
                            setIsEditingPhone(false);
                            setEditingPhone(appointment.lead_phone_number || '');
                          }
                        }}
                        className="text-sm flex-1"
                        autoFocus
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <>
                        <span className="text-sm text-gray-600">{appointment.lead_phone_number}</span>
                        {onUpdatePhone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setIsEditingPhone(true)}
                            aria-label="Edit phone"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Phone Number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Date Info - More compact on mobile */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Created: {formatDateTime(appointment.created_at)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              {appointment.date_of_appointment || appointment.requested_time ? (
                <span className="text-sm font-bold text-gray-900">
                  {appointment.date_of_appointment
                    ? (<>
                        Appointment: {formatDate(appointment.date_of_appointment)}
                        {appointment.requested_time && ` ${formatTime(appointment.requested_time)}`}
                      </>)
                    : (`Time: ${formatTime(appointment.requested_time)}`)
                  }
                </span>
              ) : (
                <span className="text-sm text-gray-500 italic">
                  No appointment date/time set
                </span>
              )}
              {hasManagementAccess() && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Edit appointment date and time"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="z-50 w-auto p-0 bg-background border shadow-md" align="start">
                    <div className="flex flex-col gap-2">
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
                      <div className="px-3 pb-3">
                        <label className="text-sm font-medium mb-1 block">Time</label>
                        <Input
                          type="time"
                          value={timeValue}
                          onChange={(e) => setTimeValue(e.target.value)}
                          onBlur={() => onUpdateTime(appointment.id, timeValue || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onUpdateTime(appointment.id, timeValue || null);
                            }
                            if (e.key === 'Escape') {
                              setTimeValue(appointment.requested_time ? appointment.requested_time.slice(0,5) : '');
                            }
                          }}
                          className="h-9"
                          placeholder="Select time"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

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
          
          {/* GHL Sync Status Badge */}
          {appointment.ghl_appointment_id && appointment.last_ghl_sync_status && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    {appointment.last_ghl_sync_status === 'success' && (
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        GHL Synced
                      </Badge>
                    )}
                    {appointment.last_ghl_sync_status === 'failed' && (
                      <>
                        <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                          <XCircle className="h-3 w-3 mr-1" />
                          GHL Sync Failed
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleRetryGhlSync}
                          disabled={retryingGhlSync}
                          aria-label="Retry GHL sync"
                        >
                          {retryingGhlSync ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      </>
                    )}
                    {appointment.last_ghl_sync_status === 'pending' && (
                      <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
                        <Clock className="h-3 w-3 mr-1" />
                        GHL Syncing...
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {appointment.last_ghl_sync_status === 'success' && (
                    <p>Last synced: {appointment.last_ghl_sync_at ? new Date(appointment.last_ghl_sync_at).toLocaleString() : 'Unknown'}</p>
                  )}
                  {appointment.last_ghl_sync_status === 'failed' && (
                    <p>Error: {appointment.last_ghl_sync_error || 'Unknown error'}</p>
                  )}
                  {appointment.last_ghl_sync_status === 'pending' && (
                    <p>Sync in progress...</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {/* Status and Procedure Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Select 
              value={appointment.status ? 
                statusOptions.find(option => 
                  option.toLowerCase().replace(/\s+/g, '') === appointment.status?.toLowerCase().replace(/\s+/g, '')
                ) || appointment.status
                : ''}
              onValueChange={handleStatusChange}
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
              value={appointment.procedure_ordered === null ? 'null' : appointment.procedure_ordered.toString()} 
              onValueChange={(value) => {
                if (value === 'null') {
                  onUpdateProcedure(appointment.id, null);
                } else {
                  onUpdateProcedure(appointment.id, value === 'true');
                }
              }}
            >
              <SelectTrigger className={getProcedureTriggerClass()}>
                <SelectValue placeholder="Select procedure status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Not Set</SelectItem>
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
          parsedMedicalInfo={appointment.parsed_medical_info}
          detectedInsuranceProvider={appointment.detected_insurance_provider}
          detectedInsurancePlan={appointment.detected_insurance_plan}
          detectedInsuranceId={appointment.detected_insurance_id}
          insuranceIdLink={appointment.insurance_id_link}
          insuranceBackLink={appointment.insurance_back_link}
          dob={appointment.dob}
          appointmentId={appointment.id}
          onUpdate={() => window.location.reload()}
          projectName={appointment.project_name}
          patientName={appointment.lead_name}
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
          patientDob={dobDisplay || undefined}
        />
      )}
      
      <DetailedAppointmentView
        isOpen={showDetailedView}
        onClose={() => setShowDetailedView(false)}
        appointment={appointment}
        onDataRefresh={() => window.location.reload()}
      />

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select the new date and time for {appointment.lead_name}'s appointment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Current Appointment Info */}
            {(appointment.date_of_appointment || appointment.requested_time) && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Current Appointment:</p>
                <p className="text-sm">
                  {appointment.date_of_appointment && formatDate(appointment.date_of_appointment)}
                  {appointment.date_of_appointment && appointment.requested_time && ' at '}
                  {appointment.requested_time && formatTime(appointment.requested_time)}
                </p>
              </div>
            )}
            
            {/* New Date Picker */}
            <div>
              <Label>New Appointment Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start mt-1">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {rescheduleDate ? formatDateFns(rescheduleDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={setRescheduleDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* New Time Picker */}
            <div>
              <Label>New Appointment Time (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-1 mt-1">
                Time is in <span className="font-semibold">{formatTimezoneName(projectTimezone)}</span> ({projectTimezone})
              </p>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* Notes */}
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                placeholder="Add any additional notes about the reschedule..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRescheduleDialog(false);
                setRescheduleDate(undefined);
                setRescheduleTime('');
                setRescheduleNotes('');
              }}
              disabled={submittingReschedule}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRescheduleSubmit} 
              disabled={!rescheduleDate || submittingReschedule}
            >
              {submittingReschedule ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Reschedule Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>;
};

export default AppointmentCard;