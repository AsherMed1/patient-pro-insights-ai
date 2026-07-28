import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const csvEscape = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rows: any[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("all_appointments")
        .select(
          "id,lead_name,project_name,date_of_appointment,requested_time,status,date_appointment_created,patient_intake_notes,detected_insurance_provider,parsed_insurance_info,parsed_medical_info,parsed_pathology_info,parsed_demographics,dob,parse_attempts,parsing_completed_at,is_superseded",
        )
        .or("is_superseded.is.null,is_superseded.eq.false")
        .not("patient_intake_notes", "is", null)
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < pageSize) break;
    }

    const out: string[][] = [];
    for (const r of rows) {
      const notes: string = r.patient_intake_notes ?? "";
      if (notes.trim().length <= 80) continue;

      const ins = (r.parsed_insurance_info ?? {}) as any;
      const med = (r.parsed_medical_info ?? {}) as any;
      const path = r.parsed_pathology_info as any;
      const demo = (r.parsed_demographics ?? {}) as any;

      const mIns =
        !(r.detected_insurance_provider ?? "").trim() &&
        !((ins.provider ?? "") as string).trim() &&
        /insurance|plan:|payer|medicare|medicaid|aetna|cigna|humana|blue cross|bcbs|united/i.test(notes);
      const mPcp =
        !((med.pcp ?? med.pcp_name ?? "") as string).trim() &&
        /pcp|primary care/i.test(notes);
      const mPath =
        (!path || Object.keys(path).length === 0) &&
        /pain level|symptoms|duration/i.test(notes);
      const mDob =
        !r.dob && !((demo.dob ?? "") as string).trim() &&
        /dob|date of birth|birthday/i.test(notes);

      if (!(mIns || mPcp || mPath || mDob)) continue;

      out.push([
        r.id,
        r.lead_name ?? "",
        r.project_name ?? "",
        r.date_of_appointment ?? "",
        r.requested_time ?? "",
        r.status ?? "",
        r.date_appointment_created ?? "",
        mIns ? "Y" : "N",
        mPcp ? "Y" : "N",
        mPath ? "Y" : "N",
        mDob ? "Y" : "N",
        String([mIns, mPcp, mPath, mDob].filter(Boolean).length),
        String(notes.length),
        r.parse_attempts ?? "",
        r.parsing_completed_at ?? "",
      ]);
    }

    out.sort((a, b) =>
      a[2].localeCompare(b[2]) || b[6].localeCompare(a[6]) || a[0].localeCompare(b[0])
    );

    const header = [
      "Portal ID","Patient Name","Project","Appointment Date","Requested Time","Status","Date Created",
      "Missing Insurance","Missing PCP/Medical","Missing Pathology","Missing DOB","Missing Count",
      "Notes Length","Parse Attempts","Last Parsed At",
    ];
    const csv = [header, ...out].map((r) => r.map(csvEscape).join(",")).join("\n");

    return new Response(csv, {
      headers: { ...corsHeaders, "Content-Type": "text/csv" },
    });
  } catch (e) {
    console.error("export-missing-info failed:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
