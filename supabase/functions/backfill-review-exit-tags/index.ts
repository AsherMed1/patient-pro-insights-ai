import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// One-off backfill: OON / declined rows never got a GHL "exit" tag, so contacts
// sit forever in GHL workflow Wait steps that only listen for 'approved'.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({} as any));
  const days = typeof body.days === "number" ? body.days : 120;
  const batchSize = typeof body.batch_size === "number" ? Math.min(200, body.batch_size) : 100;

  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: rows, error } = await supabase
    .from("all_appointments")
    .select("id, lead_name, project_name, ghl_id, review_status")
    .in("review_status", ["oon", "declined"])
    .not("ghl_id", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(batchSize);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const keys = new Map<string, string | null>();
  let succeeded = 0;
  let failed = 0;
  const failures: Array<{ id: string; reason: string }> = [];

  for (const row of rows ?? []) {
    if (!keys.has(row.project_name)) {
      const { data: proj } = await supabase
        .from("projects")
        .select("ghl_api_key")
        .eq("project_name", row.project_name)
        .maybeSingle();
      keys.set(row.project_name, proj?.ghl_api_key ?? null);
    }
    const apiKey = keys.get(row.project_name);
    if (!apiKey) {
      failed++;
      failures.push({ id: row.id, reason: "no project ghl_api_key" });
      continue;
    }

    const tag = row.review_status === "oon" ? "appointment-oon" : "appointment-declined";
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${row.ghl_id}/tags`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tags: [tag] }),
    });

    if (!res.ok) {
      failed++;
      failures.push({ id: row.id, reason: `${res.status} ${await res.text().catch(() => "")}`.slice(0, 200) });
    } else {
      succeeded++;
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  return new Response(
    JSON.stringify({ found: rows?.length ?? 0, succeeded, failed, failures }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
