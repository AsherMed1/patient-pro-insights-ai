import { useState, useEffect } from "react";
import { Search, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Patient } from "./types";

interface PatientSearchComboboxProps {
  projectName: string;
  onSelectPatient: (patient: Patient) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientSearchCombobox({
  projectName,
  onSelectPatient,
  open,
  onOpenChange,
}: PatientSearchComboboxProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setPatients([]);
      return;
    }

    const searchPatients = async () => {
      setLoading(true);
      try {
        // Search in new_leads
        const { data: leads, error: leadsError } = await supabase
          .from("new_leads")
          .select("id, lead_name, phone_number, email, project_name")
          .eq("project_name", projectName)
          .ilike("lead_name", `%${searchTerm}%`)
          .limit(5);

        if (leadsError) throw leadsError;

        // Search in all_appointments
        const { data: appointments, error: appointmentsError } = await supabase
          .from("all_appointments")
          .select("id, lead_name, lead_phone_number, lead_email, project_name, date_of_appointment")
          .eq("project_name", projectName)
          .ilike("lead_name", `%${searchTerm}%`)
          .limit(5);

        if (appointmentsError) throw appointmentsError;

        // Combine and deduplicate results
        const combinedResults: Patient[] = [];
        const seenNames = new Set<string>();

        // Add appointments first (they have appointment_id)
        appointments?.forEach((apt) => {
          if (!seenNames.has(apt.lead_name.toLowerCase())) {
            combinedResults.push({
              id: apt.id,
              lead_name: apt.lead_name,
              phone_number: apt.lead_phone_number || undefined,
              email: apt.lead_email || undefined,
              appointment_id: apt.id,
              appointment_date: apt.date_of_appointment || undefined,
              project_name: apt.project_name,
            });
            seenNames.add(apt.lead_name.toLowerCase());
          }
        });

        // Add leads
        leads?.forEach((lead) => {
          if (!seenNames.has(lead.lead_name.toLowerCase())) {
            combinedResults.push({
              id: lead.id,
              lead_name: lead.lead_name,
              phone_number: lead.phone_number || undefined,
              email: lead.email || undefined,
              project_name: lead.project_name,
            });
            seenNames.add(lead.lead_name.toLowerCase());
          }
        });

        setPatients(combinedResults);
      } catch (error) {
        console.error("Error searching patients:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, projectName]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!open) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg z-50">
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search patients..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}
          {!loading && searchTerm.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}
          {!loading && searchTerm.length >= 2 && patients.length === 0 && (
            <CommandEmpty>No patients found.</CommandEmpty>
          )}
          {!loading && patients.length > 0 && (
            <CommandGroup heading="Patients">
              {patients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  onSelect={() => {
                    onSelectPatient(patient);
                    onOpenChange(false);
                    setSearchTerm("");
                  }}
                  className="flex items-center gap-3 py-3 cursor-pointer"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(patient.lead_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{patient.lead_name}</div>
                    {patient.phone_number && (
                      <div className="text-xs text-muted-foreground">
                        {patient.phone_number}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {patient.appointment_id && (
                      <Badge variant="secondary" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        Appt
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
}
