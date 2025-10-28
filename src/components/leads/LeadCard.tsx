
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, MapPin, Calendar, Building, Clock, Heart, FileText, Shield } from 'lucide-react';
import { formatDateInCentralTime, formatDateTimeForTable } from '@/utils/dateTimeUtils';
import InsuranceViewModal from '@/components/InsuranceViewModal';

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
  insurance_id_link?: string;
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
  appointment_info?: {
    lead_name: string;
    date_of_appointment: string | null;
    requested_time: string | null;
    status: string | null;
    calendar_name: string | null;
  } | null;
}

interface LeadCardProps {
  lead: NewLead;
  onViewCalls: (leadName: string) => void;
  onViewFullDetails: (lead: NewLead) => void;
}

const LeadCard = ({ lead, onViewCalls, onViewFullDetails }: LeadCardProps) => {
  const [showInsurance, setShowInsurance] = useState(false);

  const getDisplayName = (lead: NewLead) => {
    if (lead.first_name && lead.last_name) {
      return `${lead.first_name} ${lead.last_name}`;
    }
    return lead.lead_name;
  };

  const hasInsuranceInfo = lead.insurance_provider || 
                          lead.insurance_plan || 
                          lead.insurance_id || 
                          lead.group_number;

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

  return (
    <>
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{getDisplayName(lead)}</span>
              {lead.status && (
                <Badge variant="outline" className="text-xs">
                  {lead.status}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">{lead.project_name}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
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

            {lead.appointment_info && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">
                  Appointment: {lead.appointment_info.date_of_appointment ? formatDate(lead.appointment_info.date_of_appointment) : 'Date TBD'}
                  {lead.appointment_info.requested_time && ` at ${lead.appointment_info.requested_time}`}
                  {lead.appointment_info.status && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {lead.appointment_info.status}
                    </Badge>
                  )}
                </span>
              </div>
            )}

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
              
              {lead.procedure_ordered && (
                <div className="text-xs">
                  <Badge variant="secondary" className="text-xs">
                    Procedure Ordered
                  </Badge>
                </div>
              )}
            </div>

            {lead.notes && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <strong>Notes:</strong> {lead.notes}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end space-y-2 ml-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewCalls(lead.lead_name)}
                className="flex items-center space-x-1"
              >
                <Phone className="h-3 w-3" />
                <span className="text-sm">
                  {lead.actual_calls_count || 0} calls
                </span>
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
            
            {hasInsuranceInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInsurance(true)}
                className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 border-blue-200"
              >
                <Shield className="h-3 w-3 text-blue-600" />
                <span className="text-blue-600">View Insurance</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <InsuranceViewModal
        isOpen={showInsurance}
        onClose={() => setShowInsurance(false)}
        insuranceInfo={{
          insurance_provider: lead.insurance_provider,
          insurance_plan: lead.insurance_plan,
          insurance_id: lead.insurance_id,
          insurance_id_link: lead.insurance_id_link,
          group_number: lead.group_number
        }}
        patientName={getDisplayName(lead)}
        patientPhone={lead.phone_number}
      />
    </>
  );
};

export default LeadCard;
