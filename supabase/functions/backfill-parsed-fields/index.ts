import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Backfill: mark records as needing re-parsing when:
 *  - intake notes contain a known label (Insurance Provider/Plan/ID/Group/PCP/PAE w/BPH)
 *  - AND the corresponding parsed_* field is null/empty
 *
 * Resets parsing_completed_at = NULL so the auto-parse-intake-notes cron picks them up
 * with the newly-added regex enrichment + PAE BPH extractors.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body?.dryRun ?? false;
    const projectFilter: string | null = body?.project ?? null;

    // Pull candidate rows in pages — limited to those with intake notes.
    const PAGE = 1000;
    let offset = 0;
    const candidates: { id: string; project_name: string }[] = [];

    while (true) {
      let q = supabase
        .from("all_appointments")
        .select(
          "id, project_name, patient_intake_notes, parsed_insurance_info, parsed_medical_info, parsed_pathology_info",
        )
        .not("patient_intake_notes", "is", null)
        .neq("patient_intake_notes", "")
        .range(offset, offset + PAGE - 1);
      if (projectFilter) q = q.eq("project_name", projectFilter);

      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const r of data) {
        const notes: string = r.patient_intake_notes || "";
        const ins = r.parsed_insurance_info || {};
        const med = r.parsed_medical_info || {};
        const path = r.parsed_pathology_info || {};

        const needs =
          (/Insurance Provider\s*:/i.test(notes) && !ins.insurance_provider) ||
          (/Insurance Plan\s*:/i.test(notes) && !ins.insurance_plan) ||
          (/Insurance ID Number\s*:/i.test(notes) && !ins.insurance_id_number) ||
          (/Insurance Group Number\s*:/i.test(notes) && !ins.insurance_group_number) ||
          (/Primary Care/i.test(notes) && !med.pcp_name) ||
          (/PAE w\/?\s*BPH\s*\|/i.test(notes) &&
            (!path.symptoms || !path.duration || !path.previous_treatments));

        if (needs) candidates.push({ id: r.id, project_name: r.project_name });
      }

      if (data.length < PAGE) break;
      offset += PAGE;
    }

    // Group counts per project for reporting
    const perProject: Record<string, number> = {};
    for (const c of candidates) {
      perProject[c.project_name] = (perProject[c.project_name] || 0) + 1;
    }

    if (!dryRun && candidates.length > 0) {
      // Update in chunks of 200
      for (let i = 0; i < candidates.length; i += 200) {
        const chunk = candidates.slice(i, i + 200).map((c) => c.id);
        const { error: upErr } = await supabase
          .from("all_appointments")
          .update({ parsing_completed_at: null })
          .in("id", chunk);
        if (upErr) console.error("[BACKFILL] update error:", upErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        totalCandidates: candidates.length,
        perProject,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[BACKFILL] error", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
