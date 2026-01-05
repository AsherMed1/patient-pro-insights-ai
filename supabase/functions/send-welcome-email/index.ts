import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configurable sender email - use custom domain when verified
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Patient Pro Client Portal <onboarding@resend.dev>";
// Optional: allow specific test email in sandbox mode
const RESEND_ALLOWED_TEST_EMAIL = Deno.env.get("RESEND_ALLOWED_TEST_EMAIL") || "";

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  fullName?: string;
  password?: string;
}

const generateWelcomeEmail = (fullName: string, email: string, password?: string) => {
  const displayName = fullName || email.split('@')[0];
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Patient Pro Client Portal</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; background: linear-gradient(135deg, #1A9DFC 0%, #0D7DD9 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to Patient Pro Client Portal</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 24px;">
                Hi <strong>${displayName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 24px;">
                Thank you for joining <strong>Patient Pro Client Portal</strong>! We're excited to have you on board.
              </p>
              
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 24px;">
                Your account has been successfully created and you now have access to our comprehensive patient management and analytics platform.
              </p>
              
              <!-- Feature Highlights -->
              <div style="margin: 30px 0; padding: 24px; background-color: #f9fafb; border-radius: 6px; border-left: 4px solid #1A9DFC;">
                <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">What you can do:</h2>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; font-size: 15px; line-height: 24px;">
                  <li style="margin-bottom: 8px;">Track and manage patient appointments</li>
                  <li style="margin-bottom: 8px;">Monitor leads and conversion metrics</li>
                  <li style="margin-bottom: 8px;">Analyze call center performance</li>
                  <li style="margin-bottom: 8px;">View comprehensive project dashboards</li>
                  <li style="margin-bottom: 8px;">Generate insights with AI-powered analytics</li>
                </ul>
              </div>
              
              ${password ? `
              <!-- Login Credentials Box -->
              <div style="margin: 30px 0; padding: 24px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">🔐 Your Login Credentials</h3>
                <p style="margin: 0 0 12px 0; color: #78350f; font-size: 15px; line-height: 22px;">
                  <strong>Email:</strong> ${email}
                </p>
                <p style="margin: 0 0 12px 0; color: #78350f; font-size: 15px; line-height: 22px;">
                  <strong>Password:</strong> <code style="background-color: #fffbeb; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 14px; border: 1px solid #fde68a;">${password}</code>
                </p>
                <p style="margin: 12px 0 0 0; color: #92400e; font-size: 13px; line-height: 18px; font-style: italic;">
                  ⚠️ Please change your password after your first login for security.
                </p>
              </div>
              ` : `
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 24px;">
                Your login email is: <strong>${email}</strong>
              </p>
              `}
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://patientproclients.com/" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1A9DFC 0%, #0D7DD9 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Get Started Now
                </a>
              </div>
              
              <p style="margin: 30px 0 20px 0; color: #6b7280; font-size: 14px; line-height: 20px;">
                If you have any questions or need assistance, please don't hesitate to reach out to our support team.
              </p>
              
              <p style="margin: 0; color: #333333; font-size: 16px; line-height: 24px;">
                Best regards,<br>
                <strong>The PatientPro Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 18px;">
                © ${new Date().getFullYear()} Patient Pro Client Portal. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px; line-height: 16px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName, password }: WelcomeEmailRequest = await req.json();

    console.log(`Processing welcome email for user: ${email}`);
    console.log(`Password provided: ${password ? 'YES (length: ' + password.length + ')' : 'NO'}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if welcome email was already sent
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("welcome_email_sent, welcome_email_sent_at")
      .eq("id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching profile:", fetchError);
      throw new Error("Failed to fetch user profile");
    }

    if (profile?.welcome_email_sent) {
      console.log(`Welcome email already sent to ${email} at ${profile.welcome_email_sent_at}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Welcome email already sent",
          sent_at: profile.welcome_email_sent_at 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Sandbox mode guard: check if using resend.dev and recipient is not allowed
    const isResendSandbox = FROM_EMAIL.includes("resend.dev");
    if (isResendSandbox && RESEND_ALLOWED_TEST_EMAIL && email !== RESEND_ALLOWED_TEST_EMAIL) {
      console.warn(`Sandbox mode: Cannot send to ${email}. Only ${RESEND_ALLOWED_TEST_EMAIL} is allowed.`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Resend is in sandbox mode. To send emails to all users, verify your domain at https://resend.com/domains and set the RESEND_FROM_EMAIL secret (e.g., 'PatientPro Insights <insights@patientpromarketing.com>'). Currently, emails can only be sent to: ${RESEND_ALLOWED_TEST_EMAIL}`,
          sandboxMode: true
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    // Log sender configuration for debugging
    const fromDomain = FROM_EMAIL.match(/@([^>]+)/)?.[1] || 'unknown';
    console.log(`Sending email with FROM_EMAIL: ${FROM_EMAIL}`);
    console.log(`Extracted sender domain: ${fromDomain}`);
    console.log(`Recipient: ${email}`);

    // Send welcome email using Resend
    const emailHtml = generateWelcomeEmail(fullName || email, email, password);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: "Welcome to Patient Pro Client Portal - Let's Get Started!",
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      console.error("Error status:", emailResponse.status);
      
      // Handle domain verification errors specifically
      if (errorData.statusCode === 403 && errorData.message?.includes("domain is not verified")) {
        console.error(`Domain verification failed for: ${fromDomain}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Sender domain '${fromDomain}' is not verified in Resend. Please verify your domain at https://resend.com/domains or update RESEND_FROM_EMAIL to use a verified domain.`,
            domainVerificationError: true,
            details: { from: FROM_EMAIL, domain: fromDomain }
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400 
          }
        );
      }
      
      throw new Error(`Failed to send email: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    // Mark welcome email as sent
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        welcome_email_sent: true,
        welcome_email_sent_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      // Don't throw - email was sent successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Welcome email sent successfully",
        email_id: emailData.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
