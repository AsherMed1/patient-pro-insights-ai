import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FormatOptions {
  type: 'patient_intake_notes' | 'form_submission' | 'appointment_summary' | 'general';
  data: string | object;
  recordId?: string;
  tableName?: string;
  context?: string;
}

interface FormatResult {
  formattedText: string;
  success: boolean;
  originalLength?: number;
  formattedLength?: number;
  error?: string;
}

export const useAIFormatting = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatWithAI = async (options: FormatOptions): Promise<FormatResult | null> => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('format-intake-ai', {
        body: options
      });

      if (error) {
        console.error('AI formatting error:', error);
        toast({
          title: "AI Formatting Failed",
          description: error.message || "Failed to format with AI",
          variant: "destructive",
        });
        return null;
      }

      if (data?.success) {
        toast({
          title: "Formatting Complete",
          description: `Successfully formatted ${data.originalLength} characters into ${data.formattedLength} characters`,
        });
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error calling AI formatting:', error);
      toast({
        title: "Formatting Error",
        description: "An error occurred while formatting with AI",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const formatPatientIntake = async (notes: string, recordId?: string, tableName?: string) => {
    return formatWithAI({
      type: 'patient_intake_notes',
      data: notes,
      recordId,
      tableName
    });
  };

  const formatFormSubmission = async (formData: object, recordId?: string, tableName?: string) => {
    return formatWithAI({
      type: 'form_submission',
      data: formData,
      recordId,
      tableName
    });
  };

  const formatAppointmentSummary = async (appointmentData: object, recordId?: string, tableName?: string) => {
    return formatWithAI({
      type: 'appointment_summary',
      data: appointmentData,
      recordId,
      tableName
    });
  };

  return {
    loading,
    formatWithAI,
    formatPatientIntake,
    formatFormSubmission,
    formatAppointmentSummary
  };
};