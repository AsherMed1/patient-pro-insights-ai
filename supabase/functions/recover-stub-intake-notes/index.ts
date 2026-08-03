import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Recovers appointments whose patient_intake_notes are a stub.
//
// Booking webhooks that fire before the intake form is attached to the GHL
// contact store a ~90-130 char note ("**Contact:** address: ...") and the old
// merge rule then refused every richer payload, so those records stayed blank
// in the client portal forever. This sweep re-pulls the full GHL contact for
// each stub, rebuilds the notes, and lets the parser rerun.
//
// Body: { limit?: number, project_name?: string, max_notes_length?: number, dry_run?: boolean }

const DEFAULT_LIMIT = 200;
const DEFAULT_MAX_NOTES = 300;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 400;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let limit = DEFAULT_LIMIT;
  let maxNotes = DEFAULT_MAX_NOTES;
  let projectName: string | null = null;
  let dryRun = false;

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body.limit === "number") limit = Math.min(1000, Math.max(1, body.limit));
      if (typeof body.max_notes_length === "number") maxNotes = Math.max(0, body.max_notes_length);
      if (typeof body.project_name === "string" && body.project_name.trim()) projectName = body.project_name.trim();
      if (body.dry_run === true) dryRun = true;
    }
  } catch (_e) { /* defaults */ }

  let query = supabase
    .from("all_appointments")
    .select("id, lead_name, project_name, patient_intake_notes, ghl_id")
    .not("ghl_id", "is", null)
    .eq("is_superseded", false)
    .order("created_at", { ascending: false })
    .limit(Math.min(1000, limit * 3));

  if (projectName) query = query.eq("project_name", projectName);

  const { data: rows, error } = await query;

  if (error) {
    console.error("[recover-stubs] query failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const candidates = (rows || [])
    .filter((r) => (r.patient_intake_notes || "").trim().length < maxNotes)
    .slice(0, limit);

  const byProject: Record<string, number> = {};
  for (const c of candidates) {
    byProject[c.project_name || "unknown"] = (byProject[c.project_name || "unknown"] || 0) + 1;
  }

  console.log(`[recover-stubs] ${candidates.length} stub rows found; dry_run=${dryRun}`);

  if (dryRun || candidates.length === 0) {
    return new Response(
      JSON.stringify({ found: candidates.length, dry_run: dryRun, by_project: byProject }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Long job: process in the background so the 60s wall clock is not a limit.
  const work = (async () => {
    let recovered = 0;
    let unchanged = 0;
    let failed = 0;

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (row) => {
          const before = (row.patient_intake_notes || "").trim().length;
          try {
            const { error: fetchErr } = await supabase.functions.invoke("fetch-ghl-contact-data", {
              body: { appointmentId: row.id },
            });
            if (fetchErr) {
              failed++;
              console.error(`[recover-stubs] fetch failed for ${row.lead_name} (${row.id}):`, fetchErr);
              return;
            }

            const { data: after } = await supabase
              .from("all_appointments")
              .select("patient_intake_notes")
              .eq("id", row.id)
              .maybeSingle();

            const afterLen = (after?.patient_intake_notes || "").trim().length;
            if (afterLen > before + 50) {
              recovered++;
              // Clear the parse stamp so auto-parse reprocesses the richer notes.
              await supabase
                .from("all_appointments")
                .update({ parsing_completed_at: null, parse_attempts: 0 })
                .eq("id", row.id);
            } else {
              unchanged++;
            }
          } catch (e) {
            failed++;
            console.error(`[recover-stubs] threw for ${row.id}:`, e);
          }
        }),
      );

      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }

    console.log(
      `[recover-stubs] done: recovered=${recovered} unchanged=${unchanged} failed=${failed}`,
    );

    // Kick the parser once for everything we un-stamped.
    try {
      await supabase.functions.invoke("auto-parse-intake-notes", { body: {} });
    } catch (e) {
      console.error("[recover-stubs] parser kick failed:", e);
    }
  })();

  // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
  EdgeRuntime.waitUntil(work);

  return new Response(
    JSON.stringify({
      started: true,
      queued: candidates.length,
      by_project: byProject,
      note: "Recovery runs in the background; check function logs for the final counts.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
