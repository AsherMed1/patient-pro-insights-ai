import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePlan, isUnknownInsuranceOption } from "../_shared/oon-matcher.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

/** True when a GHL custom-field name looks like the insurance-provider picker. */
function isInsuranceProviderField(name: unknown): boolean {
  const n = normalizePlan(name);
  if (!n) return false;
  if (n.includes("insurance provider")) return true;
  if (n.includes("select your insurance")) return true;
  if (n.includes("insurance carrier")) return true;
  if (n.includes("insurance company")) return true;
  return false;
}

/** Pull the dropdown choices out of a GHL custom-field definition. */
function extractOptions(field: any): string[] {
  const raw = field?.picklistOptions ?? field?.options ?? field?.picklistImageOptions ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o: any) => {
      if (typeof o === "string") return o;
      if (o && typeof o === "object") return o.name ?? o.label ?? o.value ?? o.key ?? null;
      return null;
    })
    .filter((v: any) => typeof v === "string" && v.trim())
    .map((v: string) => v.trim());
}

interface SyncResult {
  project_name: string;
  status: "synced" | "no_credentials" | "field_not_found" | "error";
  options?: number;
  deactivated?: number;
  message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.json().catch(() => ({}));
    const projectName: string | undefined = body.project_name;

    let query = supabase
      .from("projects")
      .select("project_name, ghl_api_key, ghl_location_id")
      .order("project_name");
    if (projectName) query = query.eq("project_name", projectName);

    const { data: projects, error } = await query;
    if (error) throw error;

    // Canonical plans + aliases so synced options can auto-link.
    const [{ data: plans }, { data: aliases }] = await Promise.all([
      supabase.from("insurance_canonical_plans").select("id, canonical_name"),
      supabase.from("insurance_plan_aliases").select("plan_id, alias"),
    ]);
    const planIdByTerm = new Map<string, string>();
    for (const p of plans || []) planIdByTerm.set(normalizePlan(p.canonical_name), p.id);
    for (const a of aliases || []) {
      const key = normalizePlan(a.alias);
      if (key && !planIdByTerm.has(key)) planIdByTerm.set(key, a.plan_id);
    }

    const results: SyncResult[] = [];

    for (const project of projects || []) {
      const name = project.project_name as string;
      if (!project.ghl_api_key || !project.ghl_location_id) {
        results.push({ project_name: name, status: "no_credentials" });
        continue;
      }

      try {
        const res = await fetch(
          `${GHL_BASE_URL}/locations/${project.ghl_location_id}/customFields`,
          {
            headers: {
              Authorization: `Bearer ${project.ghl_api_key}`,
              Version: GHL_API_VERSION,
              "Content-Type": "application/json",
            },
          },
        );
        if (!res.ok) {
          const text = await res.text();
          results.push({
            project_name: name,
            status: "error",
            message: `GHL ${res.status}: ${text.slice(0, 200)}`,
          });
          continue;
        }

        const data = await res.json();
        const defs: any[] = data.customFields || [];
        const field = defs.find((d) => isInsuranceProviderField(d?.name));
        if (!field) {
          results.push({ project_name: name, status: "field_not_found" });
          continue;
        }

        let options = extractOptions(field);
        if (!options.length && field.id) {
          // The list endpoint often omits choices; the single-field endpoint returns them.
          const detailRes = await fetch(
            `${GHL_BASE_URL}/locations/${project.ghl_location_id}/customFields/${field.id}`,
            {
              headers: {
                Authorization: `Bearer ${project.ghl_api_key}`,
                Version: GHL_API_VERSION,
                "Content-Type": "application/json",
              },
            },
          );
          if (detailRes.ok) {
            const detail = await detailRes.json();
            options = extractOptions(detail.customField ?? detail);
          }
        }
        if (!options.length) {
          results.push({
            project_name: name,
            status: "field_not_found",
            message: `Field "${field.name}" returned no options (keys: ${Object.keys(field).join(",")})`,
          });
          continue;
        }


        const now = new Date().toISOString();
        const seen = new Set<string>();
        const rows = options
          .map((raw) => ({
            project_name: name,
            raw_option: raw,
            normalized: normalizePlan(raw),
            plan_id: planIdByTerm.get(normalizePlan(raw)) ?? null,
            source: "ghl",
            is_unknown_option: isUnknownInsuranceOption(raw),
            active: true,
            last_synced_at: now,
          }))
          .filter((r) => {
            if (!r.normalized || seen.has(r.normalized)) return false;
            seen.add(r.normalized);
            return true;
          });

        const { error: upErr } = await supabase
          .from("clinic_supported_insurances")
          .upsert(rows, { onConflict: "project_name,normalized" });
        if (upErr) throw upErr;

        // Options that disappeared from GHL are kept but marked inactive.
        const { data: deactivated, error: deErr } = await supabase
          .from("clinic_supported_insurances")
          .update({ active: false })
          .eq("project_name", name)
          .eq("source", "ghl")
          .not("normalized", "in", `(${[...seen].map((n) => `"${n}"`).join(",")})`)
          .select("id");
        if (deErr) console.error(`[sync-ghl-insurance-options] deactivate failed for ${name}:`, deErr);

        results.push({
          project_name: name,
          status: "synced",
          options: rows.length,
          deactivated: deactivated?.length ?? 0,
        });
      } catch (e) {
        console.error(`[sync-ghl-insurance-options] ${name} failed:`, e);
        results.push({ project_name: name, status: "error", message: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[sync-ghl-insurance-options] error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
