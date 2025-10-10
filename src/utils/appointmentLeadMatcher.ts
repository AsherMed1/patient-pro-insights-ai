import { supabase } from "@/integrations/supabase/client";
import type { AllAppointment } from "@/components/appointments/types";

export interface LeadAssociation {
  lead_id: string;
  contact_id: string | null;
  phone_number: string | null;
  email: string | null;
  lead_name: string;
  project_name: string;
  insurance_provider: string | null;
  insurance_plan: string | null;
  insurance_id: string | null;
  insurance_id_link: string | null;
  group_number: string | null;
  patient_intake_notes: string | null;
  dob: string | null;
  match_strategy: 'ghl_id' | 'phone' | 'email' | 'name_project';
}

/**
 * Centralized function to find the best matching lead for an appointment
 * Uses the database function for consistent matching logic
 */
export async function findAssociatedLead(appointment: AllAppointment): Promise<LeadAssociation | null> {
  try {
    const { data, error } = await supabase.rpc('get_appointment_lead_association', {
      appointment_ghl_id: appointment.ghl_id,
      appointment_phone: appointment.lead_phone_number,
      appointment_email: appointment.lead_email,
      appointment_lead_name: appointment.lead_name,
      appointment_project_name: appointment.project_name,
    });

    if (error) {
      console.error('Error finding associated lead:', error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0] as LeadAssociation;
    }

    return null;
  } catch (error) {
    console.error('Error in findAssociatedLead:', error);
    return null;
  }
}

/**
 * Find appointments associated with a lead using the same matching strategy
 */
export async function findAssociatedAppointments(lead: {
  contact_id?: string | null;
  phone_number?: string | null;
  email?: string | null;
  lead_name: string;
  project_name: string;
}): Promise<AllAppointment[]> {
  try {
    let appointments: AllAppointment[] = [];

    // Strategy 1: GHL ID match (highest priority)
    if (lead.contact_id) {
      const { data: ghlResults, error: ghlError } = await supabase
        .from('all_appointments')
        .select('*')
        .eq('ghl_id', lead.contact_id)
        .order('date_appointment_created', { ascending: false });
      
      if (!ghlError && ghlResults && ghlResults.length > 0) {
        appointments = ghlResults;
        console.log(`Found ${appointments.length} appointments by GHL ID`);
        return appointments;
      }
    }

    // Strategy 2: Phone number match
    if (lead.phone_number) {
      const { data: phoneResults, error: phoneError } = await supabase
        .from('all_appointments')
        .select('*')
        .eq('lead_phone_number', lead.phone_number)
        .order('date_appointment_created', { ascending: false });
      
      if (!phoneError && phoneResults && phoneResults.length > 0) {
        appointments = phoneResults;
        console.log(`Found ${appointments.length} appointments by phone number`);
        return appointments;
      }
    }

    // Strategy 3: Email match
    if (lead.email) {
      const { data: emailResults, error: emailError } = await supabase
        .from('all_appointments')
        .select('*')
        .eq('lead_email', lead.email)
        .order('date_appointment_created', { ascending: false });
      
      if (!emailError && emailResults && emailResults.length > 0) {
        appointments = emailResults;
        console.log(`Found ${appointments.length} appointments by email`);
        return appointments;
      }
    }

    // Strategy 4: Name + Project match (lowest priority)
    const { data: nameResults, error: nameError } = await supabase
      .from('all_appointments')
      .select('*')
      .ilike('lead_name', lead.lead_name.trim())
      .eq('project_name', lead.project_name)
      .order('date_appointment_created', { ascending: false });
    
    if (!nameError && nameResults) {
      appointments = nameResults;
      console.log(`Found ${appointments.length} appointments by name+project`);
    }

    return appointments;
  } catch (error) {
    console.error('Error finding associated appointments:', error);
    return [];
  }
}

/**
 * Check if a lead has insurance information
 */
export function hasInsuranceInfo(lead: LeadAssociation | null): boolean {
  if (!lead) return false;
  
  return !!(lead.insurance_provider || 
           lead.insurance_plan || 
           lead.insurance_id || 
           lead.group_number);
}