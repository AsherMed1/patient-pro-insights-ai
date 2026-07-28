import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROJECT = "Prospero Vascular and Interventional";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: appts, error: e1 } = await supabase
      .from("all_appointments")
      .select(
        "id,lead_name,status,procedure_status,calendar_name,date_of_appointment,requested_time,date_appointment_created,is_superseded",
      )
      .eq("project_name", PROJECT)
      .gte("date_of_appointment", "2026-04-01")
      .lte("date_of_appointment", "2026-06-30")
      .order("date_of_appointment", { ascending: true });
    if (e1) throw e1;

    const rows = (appts ?? []).filter(
      (a) => !a.is_superseded && !/reserved/i.test(a.lead_name ?? ""),
    );
    const ids = rows.map((r) => r.id);

    const notes: any[] = [];
    for (let i = 0; i < ids.length; i += 40) {
      const { data, error } = await supabase
        .from("appointment_notes")
        .select("appointment_id,note_text,created_by,created_at")
        .in("appointment_id", ids.slice(i, i + 40))
        .order("created_at", { ascending: true });
      if (error) throw error;
      notes.push(...(data ?? []));
    }

    const byAppt = new Map<string, any[]>();
    for (const n of notes) {
      const l = byAppt.get(n.appointment_id) ?? [];
      l.push(n);
      byAppt.set(n.appointment_id, l);
    }

    const out: string[][] = [[
      "Portal ID",
      "Patient Name",
      "Status",
      "Procedure Status",
      "Calendar",
      "Appointment Date",
      "Appointment Time",
      "Date Created",
      "Welcome Call At (UTC)",
      "Welcome Call By",
      "Hours Created To Welcome Call",
      "Welcome Call Before Appointment?",
      "Cancellation Source",
      "Cancelled By",
      "Cancelled At (UTC)",
      "Cancelled Before Welcome Call?",
      "Cancellation Reason",
    ]];

    for (const a of rows) {
      const ns = byAppt.get(a.id) ?? [];
      const wc = ns.find((n) => /Status changed from .* to "Welcome Call"/i.test(n.note_text ?? ""));
      const cx = ns.find((n) => /Status changed from .* to "Cancelled"/i.test(n.note_text ?? ""));
      const reasonNote = ns.find((n) => /^Cancellation Reason:/i.test((n.note_text ?? "").trim()));

      const created = a.date_appointment_created ? new Date(a.date_appointment_created + "T00:00:00Z") : null;
      const wcAt = wc ? new Date(wc.created_at) : null;
      const cxAt = cx ? new Date(cx.created_at) : null;
      const apptAt = a.date_of_appointment
        ? new Date(a.date_of_appointment + "T" + (a.requested_time ?? "00:00:00") + "Z")
        : null;

      let cancelSource = "";
      let cancelledBy = "";
      if (a.status === "Cancelled") {
        if (cx) {
          cancelledBy = cx.created_by ?? "";
          cancelSource = /gohighlevel|ghl/i.test(cancelledBy) ? "GHL" : "Portal";
        } else {
          cancelSource = "Unknown";
        }
      }

      out.push([
        a.id,
        a.lead_name ?? "",
        a.status ?? "",
        a.procedure_status ?? "",
        a.calendar_name ?? "",
        a.date_of_appointment ?? "",
        a.requested_time ?? "",
        a.date_appointment_created ?? "",
        wcAt ? wcAt.toISOString() : "",
        wc?.created_by ?? "",
        wcAt && created ? ((wcAt.getTime() - created.getTime()) / 3600000).toFixed(1) : "",
        wcAt && apptAt ? (wcAt < apptAt ? "Y" : "N") : "",
        cancelSource,
        cancelledBy,
        cxAt ? cxAt.toISOString() : "",
        a.status === "Cancelled" ? (cxAt && wcAt ? (cxAt < wcAt ? "Y" : "N") : cxAt && !wcAt ? "Y (no welcome call)" : "") : "",
        reasonNote ? (reasonNote.note_text ?? "").replace(/\s+/g, " ").trim() : "",
      ]);
    }

    const csv = out
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return new Response(csv, { headers: { "Content-Type": "text/csv" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
