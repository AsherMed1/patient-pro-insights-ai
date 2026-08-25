// Diagnose and repair primary/secondary insurance card slots for an appointment.
//
// Why this exists: GHL exposes the primary card through a merge tag
// (insurance_id_link) that can resolve to only ONE of the two uploaded files. When
// that single file is the BACK of the card, the portal used to store it as the front
// and the clinic saw the back labeled "Front of Card" with no front at all.
//
// GET/POST { appointmentId, apply?: boolean }
//  - apply=false (default): returns every card-ish GHL field, its files and their
//    real filenames, plus the slots that WOULD be written. No writes.
//  - apply=true: writes the resolved slots to all_appointments (correcting a wrong
//    front/back assignment, not just filling blanks).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

const CARD_FIELD_PATTERNS = [
  'upload a copy of your insurance card',
  'insurance_card',
  'insurance_photo',
  'insurance_image',
  'insurance_id_card',
  'front_of_insurance_card',
  'back_of_insurance_card',
  'insurance card',
  'card front',
  'card back',
  'insurance front',
  'insurance back',
  'front of insurance',
  'back of insurance',
  'front of your insurance',
  'back of your insurance',
  'insurance_id_link',
  'insurance_back_link',
  'insurance_front_link',
];

const SECONDARY_KEY_RE = /secondary|2nd|\(2\)|[_\s-]2\b|_2$/;
const BACK_KEY_RE = /back[_\s-]*(of|side)?|_back\b|\bback\b/;
const FRONT_KEY_RE = /front/;

type CardFile = { url: string; name: string; slot?: 'front' | 'back' | null; sourceKey: string };

function extractFilesFromValue(value: any): Array<{ url: string; name: string }> {
  const out: Array<{ url: string; name: string }> = [];
  const seen = new Set<string>();

  const push = (url: any, name?: any) => {
    if (typeof url !== 'string') return;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http') || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push({ url: trimmed, name: typeof name === 'string' ? name : '' });
  };

  const walk = (val: any) => {
    if (!val) return;
    if (typeof val === 'string') {
      const s = val.trim();
      if (!s) return;
      if (s.startsWith('{') || s.startsWith('[')) {
        try {
          walk(JSON.parse(s));
          return;
        } catch (_e) {
          // fall through
        }
      }
      for (const part of s.split(/[\s,;]+/)) push(part);
      return;
    }
    if (Array.isArray(val)) {
      for (const item of val) walk(item);
      return;
    }
    if (typeof val === 'object') {
      const url = (val as any).url ?? (val as any).fileUrl ?? (val as any).link;
      const name = (val as any).name ?? (val as any).fileName ?? (val as any).originalName;
      if (typeof url === 'string') {
        push(url, name);
        return;
      }
      for (const nested of Object.values(val)) walk(nested);
    }
  };

  walk(value);
  return out;
}

function fileNameFromResponse(res: Response, originalUrl: string): string {
  const cd = res.headers.get('content-disposition') || '';
  const encoded = cd.match(/filename\*\s*=\s*(?:UTF-8'')?"?([^";]+)"?/i)?.[1];
  const plain = cd.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  const candidate = encoded || plain?.[1] || plain?.[2] || '';
  if (candidate) {
    try {
      return decodeURIComponent(candidate.trim());
    } catch (_e) {
      return candidate.trim();
    }
  }
  if (res.url && res.url !== originalUrl) {
    const tail = res.url.split('?')[0].split('/').pop() || '';
    if (/\.(jpe?g|png|heic|heif|pdf|webp)$/i.test(tail)) {
      try {
        return decodeURIComponent(tail);
      } catch (_e) {
        return tail;
      }
    }
  }
  return '';
}

async function resolveFileName(url: string): Promise<string> {
  try {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const headName = fileNameFromResponse(head, url);
    if (headName) return headName;
    const partial = await fetch(url, { method: 'GET', redirect: 'follow', headers: { Range: 'bytes=0-0' } });
    const getName = fileNameFromResponse(partial, url);
    await partial.body?.cancel();
    return getName;
  } catch (e) {
    console.warn('Filename lookup failed:', (e as Error).message);
    return '';
  }
}

function assignFrontBack(files: CardFile[]): { front: string | null; back: string | null } {
  if (files.length === 0) return { front: null, back: null };
  const dedupe = (pair: { front: string | null; back: string | null }) =>
    pair.back && pair.back === pair.front ? { front: pair.front, back: null } : pair;
  const hint = (f: CardFile) => `${f.name} ${f.url}`.toLowerCase();
  const isBack = (f: CardFile) => f.slot === 'back' || (f.slot !== 'front' && /back/.test(hint(f)));
  const isFront = (f: CardFile) => f.slot === 'front' || (f.slot !== 'back' && /front/.test(hint(f)));
  const explicitBack = files.find(isBack);
  const explicitFront = files.find((f) => isFront(f) && f !== explicitBack);
  if (explicitFront || explicitBack) {
    const front = explicitFront?.url ?? files.find((f) => f !== explicitBack)?.url ?? null;
    return dedupe({ front, back: explicitBack?.url ?? null });
  }
  return dedupe({ front: files[0].url, back: files[1]?.url ?? null });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url = new URL(req.url);
    let body: any = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch (_e) {
        body = {};
      }
    }
    const appointmentId = body.appointmentId || url.searchParams.get('appointmentId');
    const apply = body.apply === true || url.searchParams.get('apply') === 'true';

    if (!appointmentId) {
      return new Response(JSON.stringify({ error: 'appointmentId is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: appt, error: apptError } = await supabase
      .from('all_appointments')
      .select('id, lead_name, project_name, ghl_id, insurance_id_link, insurance_back_link, parsed_insurance_info')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appt) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    if (!appt.ghl_id) {
      return new Response(JSON.stringify({ error: 'Appointment has no GHL contact id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('ghl_api_key, ghl_location_id')
      .eq('project_name', appt.project_name)
      .single();

    const ghlApiKey = project?.ghl_api_key || Deno.env.get('GOHIGHLEVEL_API_KEY');
    if (!ghlApiKey || !project?.ghl_location_id) {
      return new Response(JSON.stringify({ error: 'GHL credentials missing for project' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const ghlHeaders = {
      Authorization: `Bearer ${ghlApiKey}`,
      Version: GHL_API_VERSION,
      'Content-Type': 'application/json',
    };

    const defsRes = await fetch(`${GHL_BASE_URL}/locations/${project.ghl_location_id}/customFields`, {
      method: 'GET',
      headers: ghlHeaders,
    });
    const defs: Record<string, string> = {};
    if (defsRes.ok) {
      const defsData = await defsRes.json();
      for (const d of defsData.customFields || []) {
        if (d?.id && d?.name) defs[d.id] = d.name;
      }
    }

    const contactRes = await fetch(`${GHL_BASE_URL}/contacts/${appt.ghl_id}`, {
      method: 'GET',
      headers: ghlHeaders,
    });
    if (!contactRes.ok) {
      const text = await contactRes.text();
      return new Response(JSON.stringify({ error: 'Failed to fetch GHL contact', detail: text.slice(0, 300) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }
    const contactData = await contactRes.json();
    const contact = contactData.contact ?? contactData;

    const fields = (contact.customFields || []).map((f: any) => ({
      key: String(defs[f.id] || f.key || f.id || '').toLowerCase(),
      value: f.field_value ?? f.value,
    }));

    const diagnostics: any[] = [];
    const primaryFiles: CardFile[] = [];
    const secondaryFiles: CardFile[] = [];
    const seenPrimary = new Set<string>();
    const seenSecondary = new Set<string>();

    for (const f of fields) {
      const isCard = CARD_FIELD_PATTERNS.some((p) => f.key.includes(p));
      const files = extractFilesFromValue(f.value);
      if (!isCard && files.length === 0) continue;
      if (!isCard) {
        // Surface any other field that holds files — that is how we discover a
        // clinic-specific upload field name we do not match yet.
        diagnostics.push({ key: f.key, matchedAsCard: false, files: files.length });
        continue;
      }
      const isSecondary = SECONDARY_KEY_RE.test(f.key);
      const keySlot: 'front' | 'back' | null =
        f.key.includes('back_link') || (BACK_KEY_RE.test(f.key) && !FRONT_KEY_RE.test(f.key))
          ? 'back'
          : f.key.includes('front_link') || (FRONT_KEY_RE.test(f.key) && !BACK_KEY_RE.test(f.key))
            ? 'front'
            : null;
      diagnostics.push({
        key: f.key,
        matchedAsCard: true,
        slot: isSecondary ? 'secondary' : 'primary',
        keySlot,
        files: files.length,
      });
      const target = isSecondary ? secondaryFiles : primaryFiles;
      const seen = isSecondary ? seenSecondary : seenPrimary;
      for (const file of files) {
        if (seen.has(file.url)) continue;
        seen.add(file.url);
        target.push({ ...file, slot: files.length === 1 ? keySlot : null, sourceKey: f.key });
      }
    }

    // Always resolve real filenames — including for a lone file, which is exactly
    // the case that used to be mislabeled.
    const withNames = async (list: CardFile[]) =>
      await Promise.all(list.map(async (f) => (f.name ? f : { ...f, name: await resolveFileName(f.url) })));
    const namedPrimary = await withNames(primaryFiles);
    const namedSecondary = await withNames(secondaryFiles);

    const primary = assignFrontBack(namedPrimary);
    const secondary = assignFrontBack(namedSecondary);

    const existingParsed = (appt.parsed_insurance_info || {}) as Record<string, any>;
    const current = {
      primaryFront: appt.insurance_id_link || null,
      primaryBack: appt.insurance_back_link || null,
      secondaryFront: existingParsed.secondary_card_front_url || null,
      secondaryBack: existingParsed.secondary_card_back_url || null,
    };

    let applied = false;
    if (apply) {
      const parsed = { ...existingParsed };
      if (secondary.front) {
        parsed.secondary_card_front_url = secondary.front;
        parsed.secondary_card_url = secondary.front;
      }
      if (secondary.back) parsed.secondary_card_back_url = secondary.back;

      const update: Record<string, any> = {
        insurance_id_link: primary.front,
        insurance_back_link: primary.back,
        parsed_insurance_info: parsed,
        updated_at: new Date().toISOString(),
      };
      // Never blank out an existing image when GHL returned nothing for that slot.
      if (!primary.front && !primary.back) {
        delete update.insurance_id_link;
        delete update.insurance_back_link;
      }

      const { error: updateError } = await supabase
        .from('all_appointments')
        .update(update)
        .eq('id', appointmentId);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Update failed', detail: updateError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      applied = true;
    }

    return new Response(
      JSON.stringify({
        appointment: { id: appt.id, lead_name: appt.lead_name, project_name: appt.project_name },
        diagnostics,
        primaryFiles: namedPrimary.map((f) => ({ name: f.name, slot: f.slot, sourceKey: f.sourceKey, url: f.url })),
        secondaryFiles: namedSecondary.map((f) => ({ name: f.name, slot: f.slot, sourceKey: f.sourceKey, url: f.url })),
        current,
        resolved: {
          primaryFront: primary.front,
          primaryBack: primary.back,
          secondaryFront: secondary.front,
          secondaryBack: secondary.back,
        },
        applied,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('repair-insurance-card-slots failed:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
