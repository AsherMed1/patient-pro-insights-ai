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

const DEFAULT_LIMIT = 50;
const DEFAULT_MAX_NOTES = 300;
const DEFAULT_DAYS = 30;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 400;
const LOCK_NAME = "recover-stub-intake-notes";
const LOCK_TTL_SECONDS = 900;

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
  let days = DEFAULT_DAYS;
  let projectName: string | null = null;
  let dryRun = false;

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body.limit === "number") limit = Math.min(500, Math.max(1, body.limit));
      if (typeof body.max_notes_length === "number") maxNotes = Math.max(0, body.max_notes_length);
      if (typeof body.days === "number") days = Math.min(365, Math.max(1, body.days));
      if (typeof body.project_name === "string" && body.project_name.trim()) projectName = body.project_name.trim();
      if (body.dry_run === true) dryRun = true;
    }
  } catch (_e) { /* defaults */ }

  // Stub detection happens in Postgres: the old client-side filter only looked at
  // the newest few hundred rows, so older stubs were never found.
  const { data: rows, error } = await supabase.rpc("find_stub_intake_appointments", {
    _max_notes_length: maxNotes,
    _days: days,
    _limit: limit,
    _project_name: projectName,
  });

  if (error) {
    console.error("[recover-stubs] query failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const candidates = (rows || []) as Array<{
    id: string;
    lead_name: string | null;
    project_name: string | null;
    ghl_id: string | null;
    notes_length: number;
  }>;

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

  // Single-flight: a second concurrent run (cron overlap, manual kick) exits here.
  const { data: gotLock, error: lockErr } = await supabase.rpc("acquire_job_lock", {
    _job_name: LOCK_NAME,
    _ttl_seconds: LOCK_TTL_SECONDS,
  });
  if (lockErr) {
    console.error("[recover-stubs] lock error:", lockErr);
  }
  if (!gotLock) {
    console.log("[recover-stubs] another run holds the lock; skipping");
    return new Response(
      JSON.stringify({ skipped: true, reason: "already_running", found: candidates.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Long job: process in the background so the 60s wall clock is not a limit.
  const work = (async () => {
    let recovered = 0;
    let unchanged = 0;
    let failed = 0;

    try {
      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (row) => {
            const before = row.notes_length || 0;
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
      if (recovered > 0) {
        try {
          await supabase.functions.invoke("auto-parse-intake-notes", { body: {} });
        } catch (e) {
          console.error("[recover-stubs] parser kick failed:", e);
        }
      }
    } finally {
      await supabase.rpc("release_job_lock", { _job_name: LOCK_NAME });
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
