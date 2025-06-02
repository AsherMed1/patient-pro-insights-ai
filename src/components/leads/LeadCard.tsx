
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, Phone, Mail, MapPin, Calendar as CalendarIcon, Building, Clock, Heart, FileText } from 'lucide-react';
import { formatDateInCentralTime, formatDateTimeForTable } from '@/utils/dateTimeUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  knee_pain_duration?: string;
  knee_osteoarthritis_diagnosis?: boolean;
  gae_candidate?: boolean;
  trauma_injury_onset?: boolean;
  pain_severity_scale?: number;
  symptoms_description?: string;
  knee_treatments_tried?: string;
  fever_chills?: boolean;
  knee_imaging?: boolean;
  heel_morning_pain?: boolean;
  heel_pain_improves_rest?: boolean;
  heel_pain_duration?: string;
  heel_pain_exercise_frequency?: string;
  plantar_fasciitis_treatments?: string;
  plantar_fasciitis_mobility_impact?: boolean;
  plantar_fasciitis_imaging?: boolean;
  email?: string;
}

interface LeadCardProps {
  lead: NewLead;
  onViewCalls: (leadName: string) => void;
  onViewFullDetails: (lead: NewLead) => void;
  onUpdateLead: (leadId: string, updates: Partial<NewLead>) => void;
}

const statusOptions = [
  'Showed',
  'No Show', 
  'Cancelled',
  'Reschedued',
  'Confirmed',
  'Welcome Call',
  'Won'
];

const LeadCard = ({ lead, onViewCalls, onViewFullDetails, onUpdateLead }: LeadCardProps) => {
  const [procedureDate, setProcedureDate] = useState<Date | undefined>(
    lead.appt_date ? new Date(lead.appt_date) : undefined
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const getDisplayName = (lead: NewLead) => {
    if (lead.first_name && lead.last_name) {
      return `${lead.first_name} ${lead.last_name}`;
    }
    return lead.lead_name;
  };

  const getPainSeverityColor = (scale?: number) => {
    if (!scale) return 'text-gray-500';
    if (scale <= 3) return 'text-green-600';
    if (scale <= 6) return 'text-yellow-600';
    if (scale <= 8) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return formatDateInCentralTime(dateString);
  };

  const formatDateTime = (dateTimeString: string) => {
    return formatDateTimeForTable(dateTimeString);
  };

  const handleStatusChange = (newStatus: string) => {
    onUpdateLead(lead.id, { status: newStatus });
  };

  const handleProcedureOrderedChange = (checked: boolean) => {
    onUpdateLead(lead.id, { procedure_ordered: checked });
  };

  const handleProcedureDateChange = (date: Date | undefined) => {
    setProcedureDate(date);
    setIsDatePickerOpen(false);
    onUpdateLead(lead.id, { 
      appt_date: date ? date.toISOString().split('T')[0] : undefined 
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{getDisplayName(lead)}</span>
            <div className="flex items-center space-x-2">
              <Select value={lead.status || ''} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32 h-6 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status} className="text-xs">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{lead.project_name}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{formatDate(lead.date)}</span>
            {lead.appt_date && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-blue-600">Appt: {formatDate(lead.appt_date)}</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-600 font-medium">
              Came in: {formatDateTime(lead.created_at)}
            </span>
          </div>

          {/* Procedure Information */}
          <div className="flex items-center space-x-4 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`procedure-${lead.id}`}
                checked={lead.procedure_ordered || false}
                onCheckedChange={handleProcedureOrderedChange}
              />
              <label htmlFor={`procedure-${lead.id}`} className="text-sm font-medium">
                Procedure Ordered
              </label>
            </div>
            
            {lead.procedure_ordered && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Date:</span>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "text-xs h-6 px-2",
                        !procedureDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {procedureDate ? format(procedureDate, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={procedureDate}
                      onSelect={handleProcedureDateChange}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Additional Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 pt-3 border-t">
            {lead.phone_number && (
              <div className="flex items-center space-x-1 text-xs">
                <Phone className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{lead.phone_number}</span>
              </div>
            )}
            
            {lead.email && (
              <div className="flex items-center space-x-1 text-xs">
                <Mail className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{lead.email}</span>
              </div>
            )}
            
            {lead.address && (
              <div className="flex items-center space-x-1 text-xs">
                <MapPin className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{lead.address}</span>
              </div>
            )}
            
            {lead.pain_severity_scale && (
              <div className="flex items-center space-x-1 text-xs">
                <Heart className="h-3 w-3 text-gray-400" />
                <span className={`font-medium ${getPainSeverityColor(lead.pain_severity_scale)}`}>
                  Pain: {lead.pain_severity_scale}/10
                </span>
              </div>
            )}
            
            {lead.insurance_provider && (
              <div className="flex items-center space-x-1 text-xs">
                <FileText className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{lead.insurance_provider}</span>
              </div>
            )}
          </div>

          {lead.notes && (
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Notes:</strong> {lead.notes}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewCalls(lead.lead_name)}
            className="flex items-center space-x-1"
            disabled={!lead.actual_calls_count || lead.actual_calls_count === 0}
          >
            <Phone className="h-3 w-3" />
            <span>{lead.actual_calls_count || 0} calls</span>
            {lead.actual_calls_count && lead.actual_calls_count > 0 && (
              <span className="h-3 w-3">👁</span>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewFullDetails(lead)}
            className="flex items-center space-x-1"
          >
            <span className="h-3 w-3">ℹ</span>
            <span>See Full Details</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
