import { supabase } from "@/integrations/supabase/client";

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

      console.log("Welcome email response:", data);
      return data;
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      throw error;
    }
  };

  return { sendWelcomeEmail };
};
