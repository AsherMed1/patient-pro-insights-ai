// Temporary one-off export: duplicates + missing parsed intake info.
// Returns NDJSON of active (non-superseded) appointments with computed flags.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-export-token",
};

const isEmpty = (v: unknown) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "" || v === "{}" || v === "null";
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length === 0;
  return false;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cols = [
    "id",
    "lead_name",
    "project_name",
    "ghl_id",
    "ghl_appointment_id",
    "date_of_appointment",
    "status",
    "review_status",
    "created_at",
    "dob",
    "parsed_insurance_info",
    "parsed_medical_info",
    "parsed_pathology_info",
    "patient_intake_notes",
  ].join(",");

  const out: string[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("all_appointments")
      .select(cols)
      .neq("is_superseded", true)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data || data.length === 0) break;

    for (const r of data as Record<string, any>[]) {
      const notes: string = (r.patient_intake_notes || "").toString();
      const lower = notes.toLowerCase();
      out.push(
        JSON.stringify({
          id: r.id,
          name: r.lead_name,
          project: r.project_name,
          ghl_id: r.ghl_id,
          ghl_appt: r.ghl_appointment_id,
          appt_date: r.date_of_appointment,
          status: r.status,
          review: r.review_status,
          created: r.created_at,
          dob: r.dob,
          m_ins: isEmpty(r.parsed_insurance_info),
          m_med: isEmpty(r.parsed_medical_info),
          m_path: isEmpty(r.parsed_pathology_info),
          notes_len: notes.length,
          kw_ins: /insurance|member id|policy|payer|medicare|medicaid|bcbs|aetna|cigna|humana|united/.test(lower),
          kw_pcp: /primary care|pcp|physician|referring|medications|allergies|medical history/.test(lower),
          kw_path: /pain|symptom|duration|diagnos|treatment|imaging|mri|ultrasound|x-ray/.test(lower),
          kw_dob: /date of birth|dob|birth/.test(lower),
        }),
      );
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return new Response(out.join("\n"), {
    headers: { ...corsHeaders, "Content-Type": "application/x-ndjson" },
  });
});
