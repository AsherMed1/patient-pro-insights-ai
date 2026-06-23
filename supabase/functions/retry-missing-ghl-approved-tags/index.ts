import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Exempt projects: auto-approved without tagging GHL (per project rules)
const EXEMPT_PROJECTS = [
  "ECCO Medical",
  "Premier Vascular",
  "Premier Vascular Surgery",
  "Davis Vein & Vascular",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let batchSize = 50;
  let dryRun = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body.batch_size === "number") batchSize = Math.min(200, Math.max(1, body.batch_size));
      if (body.dry_run === true) dryRun = true;
    }
  } catch (_e) {}

  // Find approved appointments that haven't had the GHL tag delivery stamped.
  const { data: rows, error } = await supabase
    .from("all_appointments")
    .select("id, lead_name, project_name, ghl_id")
    .eq("review_status", "approved")
    .not("ghl_id", "is", null)
    .is("ghl_approved_tag_sent_at", null)
    .not("project_name", "in", `(${EXEMPT_PROJECTS.map((p) => `"${p}"`).join(",")})`)
    .order("created_at", { ascending: false })
    .limit(batchSize);

  if (error) {
    console.error("query failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[retry-tags] found ${rows?.length ?? 0} rows; dry_run=${dryRun}`);

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ found: 0, processed: 0, succeeded: 0, failed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (dryRun) {
    return new Response(
      JSON.stringify({ found: rows.length, dry_run: true, rows: rows.map((r) => ({ id: r.id, lead_name: r.lead_name, project_name: r.project_name })) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Cache project keys
  const projectKeys = new Map<string, string | null>();
  let succeeded = 0;
  let failed = 0;
  const failures: Array<{ id: string; reason: string }> = [];

  for (const row of rows) {
    try {
      if (!projectKeys.has(row.project_name)) {
        const { data: proj } = await supabase
          .from("projects")
          .select("ghl_api_key")
          .eq("project_name", row.project_name)
          .maybeSingle();
        projectKeys.set(row.project_name, proj?.ghl_api_key ?? null);
      }
      const apiKey = projectKeys.get(row.project_name) ?? undefined;

      const { data: tagData, error: tagErr } = await supabase.functions.invoke(
        "update-ghl-contact-tags",
        {
          body: {
            ghl_contact_id: row.ghl_id,
            ghl_api_key: apiKey,
            tags: ["approved"],
            action: "add",
          },
        },
      );

      if (tagErr || !(tagData as any)?.success) {
        failed++;
        failures.push({ id: row.id, reason: tagErr?.message || JSON.stringify(tagData) });
        console.error(`[retry-tags] failed for ${row.id} (${row.lead_name}):`, tagErr || tagData);
        continue;
      }

      await supabase
        .from("all_appointments")
        .update({ ghl_approved_tag_sent_at: new Date().toISOString() })
        .eq("id", row.id);

      succeeded++;
      console.log(`[retry-tags] tagged ${row.id} (${row.lead_name} / ${row.project_name})`);
      // Small delay to avoid hammering GHL
      await new Promise((r) => setTimeout(r, 150));
    } catch (e) {
      failed++;
      failures.push({ id: row.id, reason: (e as Error).message });
      console.error(`[retry-tags] threw for ${row.id}:`, e);
    }
  }

  return new Response(
    JSON.stringify({ found: rows.length, processed: rows.length, succeeded, failed, failures }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
