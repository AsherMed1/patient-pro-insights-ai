import { supabase } from '@/integrations/supabase/client';

const FRONT_ASSET = '/__l5e/assets-v1/b05be34a-e63b-4b4b-97a7-95fa0d69c422/jennifer-britt-front.png';
const BACK_ASSET = '/__l5e/assets-v1/58e7d064-22a3-45e1-8329-6dcf649d749a/jennifer-britt-back.png';
const GHL_ID = 'nfGcyVjDn8MjmgWjhEOn';

async function uploadCard(assetUrl: string, side: 'front' | 'back'): Promise<string | null> {
  try {
    const res = await fetch(assetUrl);
    if (!res.ok) throw new Error(`fetch ${side} failed: ${res.status}`);
    const blob = await res.blob();
    const path = `premier-vascular/${GHL_ID}-${side}-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from('insurance-cards')
      .upload(path, blob, { contentType: 'image/png', upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('insurance-cards').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error(`Card upload (${side}) failed`, e);
    return null;
  }
}

export const insertJenniferBritt = async () => {
  console.log('📝 Inserting Jennifer Britt (Premier Vascular)...');

  // Skip if already present
  const { data: existing } = await supabase
    .from('all_appointments')
    .select('id')
    .eq('ghl_id', GHL_ID)
    .maybeSingle();
  if (existing) {
    console.log('✅ Jennifer Britt already exists, skipping insert', existing.id);
    return { success: true, data: existing, skipped: true };
  }

  const [frontUrl, backUrl] = await Promise.all([
    uploadCard(FRONT_ASSET, 'front'),
    uploadCard(BACK_ASSET, 'back'),
  ]);

  const intakeNotes = `Contact: Name: Jennifer Britt | Phone: (478) 258-8754 | Email: jwpooh68@gmail.com | DOB: Dec 10th 1968 | Patient ID: ${GHL_ID} /n Insurance: Provider: Cigna Healthcare | Plan: Open Access Plus | Member ID: U62091059 02 | Group: 3347005 | Coverage Effective: 01/01/2026 | PCP/Specialist/ER/Urgent Care: 20% | In-Network Coinsurance: 80%/20% | Out-of-Network Coinsurance: 50%/50% | INN DED Ind/Fam: $3400/$6000 | OON DED Ind/Fam: $5000/$10000 | INN OOP Ind/Fam: $5000/$10000 | OON OOP Ind/Fam: $7000/$14000 | Med/Rx Deductible Applies | MultiPlan Network Savings Program`;

  const row: any = {
    lead_name: 'Jennifer Britt',
    project_name: 'Premier Vascular',
    ghl_id: GHL_ID,
    lead_phone_number: '(478) 258-8754',
    lead_email: 'jwpooh68@gmail.com',
    dob: '1968-12-10',
    date_appointment_created: new Date().toISOString(),
    date_of_appointment: null,
    is_unscheduled: true,
    status: 'Pending',
    review_status: 'approved', // Premier Vascular is exempt from review queue gate
    internal_process_complete: false,
    detected_insurance_provider: 'Cigna',
    detected_insurance_plan: 'Open Access Plus',
    detected_insurance_id: 'U62091059 02',
    insurance_id_link: frontUrl,
    insurance_back_link: backUrl,
    patient_intake_notes: intakeNotes,
    parsed_contact_info: {
      name: 'Jennifer Britt',
      phone: '(478) 258-8754',
      email: 'jwpooh68@gmail.com',
      patient_id: GHL_ID,
    },
    parsed_demographics: {
      dob: '1968-12-10',
      age: 57,
    },
    parsed_insurance_info: {
      provider: 'Cigna Healthcare',
      plan: 'Open Access Plus',
      member_id: 'U62091059 02',
      group_number: '3347005',
      coverage_effective: '01/01/2026',
      coinsurance_in_network: '80%/20%',
      coinsurance_out_of_network: '50%/50%',
      deductible_in_network: '$3400/$6000',
      deductible_out_of_network: '$5000/$10000',
      oop_in_network: '$5000/$10000',
      oop_out_of_network: '$7000/$14000',
    },
  };

  const { data, error } = await supabase
    .from('all_appointments')
    .insert([row])
    .select()
    .single();

  if (error) {
    console.error('❌ Error inserting Jennifer Britt:', error);
    return { success: false, error };
  }

  console.log('✅ Successfully inserted Jennifer Britt:', data);
  return { success: true, data };
};

// Auto-run once on app load (guarded by localStorage)
if (typeof window !== 'undefined') {
  const KEY = 'insertJenniferBritt_v1_done';
  if (!localStorage.getItem(KEY)) {
    // Wait for auth session before attempting
    setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const result = await insertJenniferBritt();
      if (result.success) localStorage.setItem(KEY, '1');
    }, 3000);
  }
}
