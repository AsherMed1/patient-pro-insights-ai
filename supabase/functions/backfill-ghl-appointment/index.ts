// Backfill missing GHL appointments by GHL contact ID.
// Use when a GHL appointment never reached our ghl-webhook-handler (webhook
// drop). Fetches the contact + all their appointments from GHL, synthesizes
// Standard Event Webhook payloads, and POSTs each to ghl-webhook-handler so
// the resulting rows are indistinguishable from webhook-created ones.
//
// POST body: { projectName: string, contactIds: string[] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-04-15";

async function ghlFetch(path: string, apiKey: string, locationId: string) {
  const url = path.startsWith("http") ? path : `${GHL_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: GHL_VERSION,
      LocationId: locationId,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    console.error(`[backfill] GHL ${res.status} ${url}:`, text.substring(0, 300));
  }
  return { ok: res.ok, status: res.status, body };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { projectName, contactIds } = await req.json();
    if (!projectName || !Array.isArray(contactIds) || contactIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "projectName and contactIds[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load project credentials
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("project_name, ghl_api_key, ghl_location_id")
      .eq("project_name", projectName)
      .maybeSingle();

    if (projErr || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found", details: projErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = project.ghl_api_key || Deno.env.get("GOHIGHLEVEL_API_KEY") || "";
    const locationId = project.ghl_location_id || "";
    if (!apiKey || !locationId) {
      return new Response(
        JSON.stringify({ error: "Project missing ghl_api_key or ghl_location_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const results: any[] = [];

    for (const contactId of contactIds) {
      const perContact: any = { contactId, appointments: [] };

      // 1) Fetch contact
      const contactRes = await ghlFetch(`/contacts/${contactId}`, apiKey, locationId);
      if (!contactRes.ok) {
        perContact.error = `Contact fetch failed: ${contactRes.status}`;
        perContact.detail = contactRes.body;
        results.push(perContact);
        continue;
      }
      const contact = contactRes.body?.contact || contactRes.body;
      perContact.contactName = contact?.contactName || contact?.name
        || `${contact?.firstName || ""} ${contact?.lastName || ""}`.trim();

      // 2) Fetch contact's appointments
      const apptListRes = await ghlFetch(
        `/contacts/${contactId}/appointments`,
        apiKey,
        locationId,
      );
      if (!apptListRes.ok) {
        perContact.error = `Appointments fetch failed: ${apptListRes.status}`;
        perContact.detail = apptListRes.body;
        results.push(perContact);
        continue;
      }
      const appointments: any[] = apptListRes.body?.events
        || apptListRes.body?.appointments
        || apptListRes.body
        || [];

      if (!Array.isArray(appointments) || appointments.length === 0) {
        perContact.error = "No appointments on this contact";
        results.push(perContact);
        continue;
      }

      // 3) For each appointment, synthesize a Standard Event Webhook payload
      //    and POST to ghl-webhook-handler. The handler dedupes, so re-running
      //    is safe.
      for (const apt of appointments) {
        const aptId = apt.id || apt.appointmentId || apt.eventId;
        const synthesized = {
          type: "AppointmentCreate",
          locationId,
          location: { id: locationId, name: project.project_name },
          appointment: {
            id: aptId,
            appointmentId: aptId,
            calendarId: apt.calendarId,
            calendarName: apt.calendarName || apt.title || apt.calendar?.name,
            calendar: apt.calendar,
            contactId,
            startTime: apt.startTime,
            endTime: apt.endTime,
            appointmentStatus: apt.appointmentStatus || apt.status,
            status: apt.appointmentStatus || apt.status,
            notes: apt.notes,
            dateAdded: apt.dateAdded || apt.createdAt || new Date().toISOString(),
            assignedUserId: apt.assignedUserId,
            address: apt.address,
            title: apt.title,
            contact: {
              id: contactId,
              name: perContact.contactName,
              firstName: contact?.firstName,
              lastName: contact?.lastName,
              email: contact?.email,
              phone: contact?.phone,
              dateOfBirth: contact?.dateOfBirth,
              customFields: contact?.customFields || [],
              tags: contact?.tags || [],
            },
          },
          customFields: contact?.customFields || [],
        };

        const handlerRes = await fetch(`${supabaseUrl}/functions/v1/ghl-webhook-handler`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify(synthesized),
        });
        const handlerText = await handlerRes.text();
        let handlerBody: any = handlerText;
        try { handlerBody = JSON.parse(handlerText); } catch { /* keep text */ }

        perContact.appointments.push({
          ghl_appointment_id: aptId,
          startTime: apt.startTime,
          status: apt.appointmentStatus || apt.status,
          handlerStatus: handlerRes.status,
          handlerBody,
        });
      }

      results.push(perContact);
    }

    return new Response(
      JSON.stringify({ success: true, project: project.project_name, results }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[backfill] error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", message: err?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
