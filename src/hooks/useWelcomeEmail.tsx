import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSendWelcomeEmail = () => {
  const sendWelcomeEmail = async (userId: string, email: string, fullName?: string, password?: string) => {
    try {
      console.log("Sending welcome email to:", email);
      
      const { data, error } = await supabase.functions.invoke("send-welcome-email", {
        body: {
          userId,
          email,
          fullName,
          password,
        },
      });

      if (error) {
        console.error("Error sending welcome email:", error);
        throw error;
      }

      // Check if response indicates sandbox mode restriction
      if (data && !data.success && data.sandboxMode) {
        toast.error("Email Configuration Required", {
          description: data.error || "Domain verification needed to send emails. Check console for details.",
          duration: 8000,
        });
        throw new Error(data.error || "Sandbox mode restriction");
      }

      // Check if response indicates domain verification error
      if (data && !data.success && data.domainVerificationError) {
        toast.error("Sender Domain Not Verified", {
          description: data.error || "The sender email domain is not verified in Resend. Please verify your domain or update RESEND_FROM_EMAIL.",
          duration: 10000,
        });
        throw new Error(data.error || "Domain verification error");
      }

      console.log("Welcome email response:", data);
      return data;
    } catch (error: any) {
      console.error("Failed to send welcome email:", error);
      
      // Provide user-friendly error message
      if (error?.message?.includes("sandbox")) {
        // Already handled above with toast
      } else if (error?.message?.includes("domain") || error?.message?.includes("verified")) {
        // Already handled above with toast for domain verification
      } else {
        toast.error("Failed to send welcome email", {
          description: "Please check your email configuration or contact support.",
        });
      }
      
      throw error;
    }
  };

  return { sendWelcomeEmail };
};
