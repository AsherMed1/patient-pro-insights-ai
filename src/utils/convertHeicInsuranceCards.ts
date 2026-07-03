/**
 * One-time backfill: convert existing .heic / .heif insurance card uploads to JPEG.
 *
 * Run from the browser console (must be signed in as an admin):
 *
 *   import("@/utils/convertHeicInsuranceCards").then(m => m.convertHeicInsuranceCards())
 *
 * Pass { dryRun: true } to preview without writing anything.
 */
import { supabase } from "@/integrations/supabase/client";

type Field = "insurance_id_link" | "insurance_back_link";

const isHeic = (url?: string | null) => {
  if (!url) return false;
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".heic") || clean.endsWith(".heif");
};

// Public Supabase URL for the insurance-cards bucket looks like:
//   https://<proj>.supabase.co/storage/v1/object/public/insurance-cards/<path>
const extractStoragePath = (url: string): string | null => {
  const marker = "/object/public/insurance-cards/";
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
};

async function convertOne(originalUrl: string): Promise<string | null> {
  const res = await fetch(originalUrl);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const blob = await res.blob();
  const heic2any = (await import("heic2any")).default;
  const out = await heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
  const jpeg = Array.isArray(out) ? out[0] : out;

  const oldPath = extractStoragePath(originalUrl);
  const basePath = oldPath
    ? oldPath.replace(/\.(heic|heif)$/i, "")
    : `backfill/${Date.now()}`;
  const newPath = `${basePath}.converted-${Date.now()}.jpg`;

  const { error: upErr } = await supabase.storage
    .from("insurance-cards")
    .upload(newPath, jpeg, { contentType: "image/jpeg", upsert: true });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from("insurance-cards").getPublicUrl(newPath);
  return data.publicUrl;
}

export async function convertHeicInsuranceCards(opts: { dryRun?: boolean; limit?: number } = {}) {
  const { dryRun = false, limit = 500 } = opts;
  console.log(`[HEIC backfill] scanning up to ${limit} rows (dryRun=${dryRun})…`);

  const { data, error } = await supabase
    .from("all_appointments")
    .select("id, lead_name, insurance_id_link, insurance_back_link")
    .or("insurance_id_link.ilike.%.heic,insurance_id_link.ilike.%.heif,insurance_back_link.ilike.%.heic,insurance_back_link.ilike.%.heif")
    .limit(limit);

  if (error) {
    console.error("[HEIC backfill] query failed", error);
    return { converted: 0, failed: 0, rows: 0 };
  }

  console.log(`[HEIC backfill] found ${data?.length ?? 0} candidate rows`);
  let converted = 0;
  let failed = 0;

  for (const row of data ?? []) {
    const updates: Partial<Record<Field, string>> = {};
    for (const field of ["insurance_id_link", "insurance_back_link"] as Field[]) {
      const url = (row as any)[field] as string | null;
      if (!isHeic(url)) continue;
      try {
        console.log(`[HEIC backfill] ${row.lead_name} / ${field}: converting…`);
        if (dryRun) { converted++; continue; }
        const newUrl = await convertOne(url!);
        if (newUrl) {
          updates[field] = newUrl;
          converted++;
        }
      } catch (err) {
        console.error(`[HEIC backfill] FAILED ${row.lead_name} / ${field}`, err);
        failed++;
      }
    }

    if (!dryRun && Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from("all_appointments")
        .update(updates)
        .eq("id", row.id);
      if (updErr) {
        console.error(`[HEIC backfill] DB update failed for ${row.lead_name}`, updErr);
        failed++;
      }
    }
  }

  console.log(`[HEIC backfill] done. converted=${converted} failed=${failed} rows=${data?.length ?? 0}`);
  return { converted, failed, rows: data?.length ?? 0 };
}
