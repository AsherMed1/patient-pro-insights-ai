import { supabase } from '@/integrations/supabase/client';

export const updateEricCareyIntake = async () => {
  console.log('Updating Eric Carey appointment...');
  
  const appointmentId = '51bee600-d1db-478b-99e3-7ad61479ab01';
  
  const updates = {
    parsed_contact_info: {
      name: "Eric Carey",
      phone: "(478) 696-3898",
      email: "careyeric123@gmail.com",
      address: "128 Will Ave NW, Milledgeville Georgia 31061"
    },
    parsed_demographics: {
      dob: "1983-05-02",
      age: 41,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Disability Medicaid",
      plan: "Disability Medicaid",
      alternate_selection: "Medicaid"
    },
    insurance_id_link: "https://storage.googleapis.com/crm-contacts-docs-production/AduufAhsgRcAom7enpME/S3i6XIOgpNtST7Aw8ndN?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=default-crm-contacts%40highlevel-backend.iam.gserviceaccount.com%2F20251118%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20251118T153005Z&X-Goog-Expires=600&X-Goog-SignedHeaders=host&X-Goog-Signature=07a5bd2baf18ff32468605e1f8d0618e13005a0b786ad1a4306487da52f8d302b57a01081fe12755d9443c27af3ebf7ef7437fa7e15b00d2d6d1a2aaee6f1e86ed341c386a29f0614d3d443ee0bb900f31fb5295a9f656b4030df9c1617353ed8c7dc3a1d0905a8de693419ca9ba45c9fcdcfda6d335741db72264143b235c166c90a0dd0977f7a94fbee13526b39d31b91985ea931adf41358d047b0485c349c4a03163e2292c12ad5f4272e682a6be820bc736e8382ada95374e708945fe9caf5c9cae630387f6fa96ba368476140351480f6e061e6261945290a3a902c060dc3000db600b90815ea5c62af5f51e85ddb039dcd761b4d3516c30863167eb72",
    ghl_id: "N2VwN33QCDmzWhaK1q2J",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Eric Carey appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Eric Carey appointment:', data);
  return { success: true, data };
};
