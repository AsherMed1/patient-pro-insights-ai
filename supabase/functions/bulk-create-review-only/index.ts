import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAILS = [
  'carmen.a@patientpromarketing.com',
  'debbie.c@patientpromarketing.com',
  'kevin.b@patientpromarketing.com',
  'lucas.g@patientpromarketing.com',
  'Nicolas.g@patientpromarketing.com',
  'nemesis.r@patientpromarketing.com',
  'nicole.c@patientpromarketing.com',
  'ntombi.n@patientpromarketing.com',
  'rodrigo.s@patientpromarketing.com',
  'silindele.n@patientpromarketing.com',
  'staecy.p@patientpromarketing.com',
  'kristiana.r@patientpromarketing.com',
  'chantel.m@patientpromarketing.com',
  'glen.l@patientpromarketing.com',
  'jason.m@patientpromarketing.com',
  'jennifer.r@patientpromarketing.com',
  'katherine.a@patientpromarketing.com',
  'kim.a@patientpromarketing.com',
  'mandy.m@patientpromarketing.com',
  'marleny.m@patientpromarketing.com',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results: any[] = [];
  const unique = Array.from(new Set(EMAILS.map(e => e.trim())));

  for (const email of unique) {
    try {
      const password = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        user_metadata: { full_name: email, must_change_password: true },
        email_confirm: true,
      });

      if (createErr) {
        results.push({ email, status: 'error', error: createErr.message });
        continue;
      }

      const userId = created.user!.id;

      await admin.from('profiles').upsert({ id: userId, email, full_name: email });

      const { error: roleErr } = await admin
        .from('user_roles')
        .insert({ user_id: userId, role: 'review_only' });

      if (roleErr) {
        results.push({ email, status: 'role_error', error: roleErr.message, password });
        continue;
      }

      results.push({ email, status: 'created', user_id: userId, password });
    } catch (e: any) {
      results.push({ email, status: 'exception', error: e.message });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
