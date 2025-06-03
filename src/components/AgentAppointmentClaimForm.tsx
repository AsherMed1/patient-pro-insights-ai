import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { User, Phone, Eye, EyeOff } from 'lucide-react';

interface ClaimFormData {
  agentId: string;
  phoneNumber: string;
}

interface Agent {
  id: string;
  agent_number: string;
  agent_name: string;
  active: boolean;
}

const AgentAppointmentClaimForm = () => {
  const [loading, setLoading] = useState(false);
  const [showAgentIds, setShowAgentIds] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<ClaimFormData>({
    defaultValues: {
      agentId: '',
      phoneNumber: ''
    }
  });

  const fetchAgents = async () => {
    try {
      setAgentsLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select('id, agent_number, agent_name, active')
        .eq('active', true)
        .order('agent_number');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent list",
        variant: "destructive"
      });
    } finally {
      setAgentsLoading(false);
    }
  };

  useEffect(() => {
    if (showAgentIds && agents.length === 0) {
      fetchAgents();
    }
  }, [showAgentIds]);

  const normalizePhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If it starts with 1 and has 11 digits, format as +1XXXXXXXXXX
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    
    // If it has 10 digits, add +1 prefix
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    
    // Return the original if it doesn't match expected patterns
    return phone;
  };

  const onSubmit = async (data: ClaimFormData) => {
    if (!data.agentId.trim() || !data.phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Both Agent ID and Phone Number are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Normalize the phone number for consistent searching
      const normalizedPhone = normalizePhoneNumber(data.phoneNumber);
      
      // First, verify the agent exists
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('agent_number, agent_name')
        .eq('agent_number', data.agentId)
        .eq('active', true)
        .single();

      if (agentError || !agent) {
        toast({
          title: "Error",
          description: "Agent ID not found or agent is inactive",
          variant: "destructive"
        });
        return;
      }

      // Search for appointments with the phone number (try multiple formats)
      const phoneSearchPatterns = [
        normalizedPhone,
        data.phoneNumber.trim(),
        data.phoneNumber.replace(/\D/g, ''), // digits only
      ];

      let appointmentFound = false;
      let updatedCount = 0;

      for (const phonePattern of phoneSearchPatterns) {
        const { data: appointments, error: searchError } = await supabase
          .from('all_appointments')
          .select('id, lead_name, project_name, date_of_appointment, agent')
          .eq('lead_phone_number', phonePattern);

        if (searchError) {
          console.error('Search error:', searchError);
          continue;
        }

        if (appointments && appointments.length > 0) {
          appointmentFound = true;
          
          // Update all matching appointments
          for (const appointment of appointments) {
            const { error: updateError } = await supabase
              .from('all_appointments')
              .update({
                agent: agent.agent_name,
                agent_number: agent.agent_number,
                updated_at: new Date().toISOString()
              })
              .eq('id', appointment.id);

            if (!updateError) {
              updatedCount++;
            }
          }
          break; // Stop searching once we find matches
        }
      }

      if (!appointmentFound) {
        toast({
          title: "No Appointments Found",
          description: `No appointments found for phone number: ${data.phoneNumber}`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Successfully claimed ${updatedCount} appointment${updatedCount !== 1 ? 's' : ''} for agent ${agent.agent_name}`,
      });

      // Reset form
      form.reset();

    } catch (error) {
      console.error('Error claiming appointment:', error);
      toast({
        title: "Error",
        description: "Failed to claim appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentIds = () => {
    setShowAgentIds(!showAgentIds);
  };

  return (
    <div className="space-y-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Claim Appointment</span>
          </CardTitle>
          <CardDescription>
            Enter your agent ID and the lead's phone number to claim credit for an appointment you booked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="agentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your agent ID (e.g., 001)"
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>Lead Phone Number</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter phone number (e.g., +13217940456 or 3217940456)"
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Processing..." : "Claim Appointment"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="max-w-md mx-auto">
        <Button 
          onClick={toggleAgentIds}
          variant="outline" 
          className="w-full flex items-center justify-center space-x-2"
          disabled={agentsLoading}
        >
          {showAgentIds ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{showAgentIds ? "Hide Agent IDs" : "See Agent IDs"}</span>
        </Button>

        {showAgentIds && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Agent Reference List</CardTitle>
              <CardDescription>
                Active agents and their IDs for easy reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agentsLoading ? (
                <p className="text-center text-gray-500">Loading agents...</p>
              ) : agents.length === 0 ? (
                <p className="text-center text-gray-500">No active agents found.</p>
              ) : (
                <div className="space-y-2">
                  {agents.map((agent) => (
                    <div key={agent.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{agent.agent_name}</span>
                      <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                        {agent.agent_number}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AgentAppointmentClaimForm;
