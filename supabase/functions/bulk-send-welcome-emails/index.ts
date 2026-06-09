import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAILS = [
  "carmen.a@patientpromarketing.com",
  "debbie.c@patientpromarketing.com",
  "kevin.b@patientpromarketing.com",
  "lucas.g@patientpromarketing.com",
  "Nicolas.g@patientpromarketing.com",
  "nemesis.r@patientpromarketing.com",
  "nicole.c@patientpromarketing.com",
  "ntombi.n@patientpromarketing.com",
  "rodrigo.s@patientpromarketing.com",
  "silindele.n@patientpromarketing.com",
  "staecy.p@patientpromarketing.com",
  "kristiana.r@patientpromarketing.com",
  "chantel.m@patientpromarketing.com",
  "glen.l@patientpromarketing.com",
  "jason.m@patientpromarketing.com",
  "jennifer.r@patientpromarketing.com",
  "katherine.a@patientpromarketing.com",
  "kim.a@patientpromarketing.com",
  "mandy.m@patientpromarketing.com",
  "marleny.m@patientpromarketing.com",
];

function genPassword() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results: any[] = [];

  // Get all users (paginate)
  const userMap = new Map<string, { id: string; full_name?: string }>();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    for (const u of data.users) {
      if (u.email) userMap.set(u.email.toLowerCase(), { id: u.id, full_name: (u.user_metadata as any)?.full_name });
    }
    if (data.users.length < 1000) break;
    page++;
  }

  for (const email of EMAILS) {
    const lookup = userMap.get(email.toLowerCase());
    if (!lookup) {
      results.push({ email, status: "error", error: "user not found" });
      continue;
    }

    const newPassword = genPassword();

    // Reset password
    const { error: pwErr } = await supabase.auth.admin.updateUserById(lookup.id, {
      password: newPassword,
      user_metadata: { must_change_password: true, full_name: lookup.full_name },
    });
    if (pwErr) {
      results.push({ email, status: "error", error: `pw reset: ${pwErr.message}` });
      continue;
    }

    // Clear welcome_email_sent so the send function doesn't skip
    await supabase.from("profiles").update({ welcome_email_sent: false }).eq("id", lookup.id);

    // Invoke welcome email
    const { data: sendData, error: sendErr } = await supabase.functions.invoke("send-welcome-email", {
      body: { userId: lookup.id, email, fullName: lookup.full_name, password: newPassword },
    });

    if (sendErr) {
      results.push({ email, status: "error", error: sendErr.message, password: newPassword });
    } else if (sendData && sendData.success === false) {
      results.push({ email, status: "error", error: sendData.error || "send failed", password: newPassword });
    } else {
      results.push({ email, status: "sent", password: newPassword });
    }
  }

  const summary = {
    total: results.length,
    sent: results.filter((r) => r.status === "sent").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  };

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
