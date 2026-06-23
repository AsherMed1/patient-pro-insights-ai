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

const APPROVED_TAG = "approved";

async function fetchGhlContactTags(ghlId: string, apiKey: string): Promise<{ ok: boolean; tags: string[]; status: number; error?: string }> {
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${ghlId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, tags: [], status: res.status, error: txt };
    }
    const json = await res.json().catch(() => ({}));
    const tags: string[] = Array.isArray(json?.contact?.tags)
      ? json.contact.tags
      : Array.isArray(json?.tags)
        ? json.tags
        : [];
    return { ok: true, tags: tags.map((t) => String(t).toLowerCase().trim()), status: res.status };
  } catch (e) {
    return { ok: false, tags: [], status: 0, error: (e as Error).message };
  }
}

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
  let forceIds: string[] = [];
  let includeBackfilled = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body.batch_size === "number") batchSize = Math.min(200, Math.max(1, body.batch_size));
      if (body.dry_run === true) dryRun = true;
      if (Array.isArray(body.force_ids)) forceIds = body.force_ids.filter((x: unknown) => typeof x === "string");
      if (body.include_backfilled === true) includeBackfilled = true;
    }
  } catch (_e) {}

  // Build query: either explicit force_ids, or sweep approved rows missing stamps
  // (optionally also revisiting backfilled rows where stamp == updated_at).
  let query = supabase
    .from("all_appointments")
    .select("id, lead_name, project_name, ghl_id, ghl_approved_tag_sent_at, updated_at")
    .eq("review_status", "approved")
    .not("ghl_id", "is", null)
    .not("project_name", "in", `(${EXEMPT_PROJECTS.map((p) => `"${p}"`).join(",")})`)
    .order("created_at", { ascending: false })
    .limit(batchSize);

  if (forceIds.length > 0) {
    query = query.in("id", forceIds);
  } else if (!includeBackfilled) {
    query = query.is("ghl_approved_tag_sent_at", null);
  }
  // includeBackfilled: skip the IS NULL filter, we'll verify each in GHL

  const { data: rows, error } = await query;

  if (error) {
    console.error("query failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[retry-tags] found ${rows?.length ?? 0} rows; dry_run=${dryRun}; force_ids=${forceIds.length}; include_backfilled=${includeBackfilled}`);

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ found: 0, processed: 0, succeeded: 0, failed: 0, already_tagged: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (dryRun) {
    return new Response(
      JSON.stringify({ found: rows.length, dry_run: true, rows: rows.map((r) => ({ id: r.id, lead_name: r.lead_name, project_name: r.project_name })) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const projectKeys = new Map<string, string | null>();
  let succeeded = 0;
  let failed = 0;
  let alreadyTagged = 0;
  let skipped = 0;
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

      if (!apiKey) {
        skipped++;
        failures.push({ id: row.id, reason: "no project ghl_api_key" });
        continue;
      }

      // 1. Verify what's actually in GHL first
      const verify = await fetchGhlContactTags(row.ghl_id!, apiKey);
      if (!verify.ok) {
        failed++;
        failures.push({ id: row.id, reason: `GET contact failed: ${verify.status} ${verify.error ?? ""}`.trim() });
        console.error(`[retry-tags] verify failed for ${row.id}:`, verify);
        continue;
      }

      if (verify.tags.includes(APPROVED_TAG)) {
        // Tag is already there — self-heal the stamp
        if (!row.ghl_approved_tag_sent_at) {
          await supabase
            .from("all_appointments")
            .update({ ghl_approved_tag_sent_at: new Date().toISOString() })
            .eq("id", row.id);
        }
        alreadyTagged++;
        console.log(`[retry-tags] already tagged in GHL: ${row.id} (${row.lead_name})`);
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }

      // 2. Push the tag
      const { data: tagData, error: tagErr } = await supabase.functions.invoke(
        "update-ghl-contact-tags",
        {
          body: {
            ghl_contact_id: row.ghl_id,
            ghl_api_key: apiKey,
            tags: [APPROVED_TAG],
            action: "add",
          },
        },
      );

      if (tagErr || !(tagData as any)?.success) {
        failed++;
        failures.push({ id: row.id, reason: tagErr?.message || JSON.stringify(tagData) });
        console.error(`[retry-tags] tag push failed for ${row.id} (${row.lead_name}):`, tagErr || tagData);
        continue;
      }

      await supabase
        .from("all_appointments")
        .update({ ghl_approved_tag_sent_at: new Date().toISOString() })
        .eq("id", row.id);

      succeeded++;
      console.log(`[retry-tags] tagged ${row.id} (${row.lead_name} / ${row.project_name})`);
      await new Promise((r) => setTimeout(r, 150));
    } catch (e) {
      failed++;
      failures.push({ id: row.id, reason: (e as Error).message });
      console.error(`[retry-tags] threw for ${row.id}:`, e);
    }
  }

  return new Response(
    JSON.stringify({ found: rows.length, processed: rows.length, succeeded, failed, already_tagged: alreadyTagged, skipped, failures }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
