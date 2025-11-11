import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

const patientProfiles = [
  {
    firstName: "David",
    lastName: "Thompson",
    age: 62,
    gender: "Male",
    dob: "1962-03-15",
    phone: "+14045551234",
    email: "david.thompson@email.com",
    address: "123 Peachtree St, Atlanta, GA 30303",
    insurance: {
      provider: "UnitedHealthcare",
      plan: "PPO Gold Plus",
      id: "UHC123456789",
      group: "GRP-9876"
    },
    medical: {
      allergies: "Penicillin, Sulfa drugs",
      medications: "Lisinopril 10mg daily, Aspirin 81mg daily, Metformin 500mg BID",
      pcp: "Dr. Sarah Johnson, Atlanta Primary Care",
      imaging: "Venous ultrasound completed"
    },
    pathology: {
      complaint: "Chronic leg pain and swelling",
      area: "Right lower extremity",
      duration: "6 months",
      painLevel: "7/10",
      symptoms: "Swelling, discoloration, pain when standing",
      treatments: "Compression stockings, elevation, ibuprofen"
    },
    condition: "Chronic Venous Insufficiency"
  },
  {
    firstName: "Emily",
    lastName: "Rodriguez",
    age: 58,
    gender: "Female",
    dob: "1966-07-22",
    phone: "+14045552345",
    email: "emily.rodriguez@email.com",
    address: "456 Oak Avenue, Atlanta, GA 30314",
    insurance: {
      provider: "Blue Cross Blue Shield",
      plan: "Blue Choice PPO",
      id: "BCBS987654321",
      group: "GRP-5432"
    },
    medical: {
      allergies: "None known",
      medications: "Atorvastatin 20mg daily, Multivitamin",
      pcp: "Dr. Michael Chen, Northside Family Medicine",
      imaging: "Venous duplex scan scheduled"
    },
    pathology: {
      complaint: "Visible varicose veins with aching",
      area: "Bilateral lower extremities",
      duration: "3 years",
      painLevel: "5/10",
      symptoms: "Bulging veins, leg heaviness, aching after standing",
      treatments: "Elevation, compression socks tried briefly"
    },
    condition: "Varicose Veins"
  },
  {
    firstName: "Robert",
    lastName: "Martinez",
    age: 71,
    gender: "Male",
    dob: "1953-11-08",
    phone: "+14045553456",
    email: "robert.martinez@email.com",
    address: "789 Maple Drive, Marietta, GA 30060",
    insurance: {
      provider: "Aetna",
      plan: "Medicare Advantage",
      id: "ATN555444333",
      group: "MCARE-001"
    },
    medical: {
      allergies: "Latex",
      medications: "Clopidogrel 75mg daily, Metoprolol 50mg BID, Atorvastatin 40mg",
      pcp: "Dr. Jennifer Williams, Cobb Primary Care",
      imaging: "Arterial doppler study completed"
    },
    pathology: {
      complaint: "Leg pain with walking (claudication)",
      area: "Left calf",
      duration: "8 months",
      painLevel: "8/10",
      symptoms: "Cramping pain with walking 2 blocks, relieved by rest",
      treatments: "Walking exercise program, smoking cessation"
    },
    condition: "Peripheral Artery Disease"
  },
  {
    firstName: "Lisa",
    lastName: "Anderson",
    age: 45,
    gender: "Female",
    dob: "1979-04-30",
    phone: "+14045554567",
    email: "lisa.anderson@email.com",
    address: "321 Pine Street, Decatur, GA 30030",
    insurance: {
      provider: "Cigna",
      plan: "Open Access Plus HMO",
      id: "CIG777888999",
      group: "GRP-2468"
    },
    medical: {
      allergies: "Codeine",
      medications: "Birth control, Vitamin D supplement",
      pcp: "Dr. Amanda Peterson, Decatur Health Center",
      imaging: "No imaging at this time"
    },
    pathology: {
      complaint: "Spider veins and early varicose veins",
      area: "Both legs, primarily thighs",
      duration: "2 years",
      painLevel: "2/10",
      symptoms: "Cosmetic concerns, minimal discomfort",
      treatments: "None yet, seeking consultation"
    },
    condition: "Spider Veins and Early Varicose Veins"
  },
  {
    firstName: "Tom",
    lastName: "Jackson",
    age: 68,
    gender: "Male",
    dob: "1956-09-14",
    phone: "+14045555678",
    email: "tom.jackson@email.com",
    address: "654 Elm Court, Roswell, GA 30075",
    insurance: {
      provider: "Humana",
      plan: "Gold Plus HMO",
      id: "HUM111222333",
      group: "MCARE-789"
    },
    medical: {
      allergies: "Aspirin",
      medications: "Warfarin 5mg daily, Carvedilol 12.5mg BID, Furosemide 40mg daily",
      pcp: "Dr. Robert Lee, Roswell Medical Associates",
      imaging: "Recent venous ultrasound shows post-thrombotic changes"
    },
    pathology: {
      complaint: "History of DVT, chronic leg swelling",
      area: "Right leg",
      duration: "1 year post-DVT",
      painLevel: "4/10",
      symptoms: "Persistent swelling, skin discoloration, dull ache",
      treatments: "Anticoagulation therapy, compression therapy"
    },
    condition: "Post-Thrombotic Syndrome"
  },
  {
    firstName: "Maria",
    lastName: "Garcia",
    age: 54,
    gender: "Female",
    dob: "1970-12-03",
    phone: "+14045556789",
    email: "maria.garcia@email.com",
    address: "987 Birch Lane, Sandy Springs, GA 30328",
    insurance: {
      provider: "Kaiser Permanente",
      plan: "KP Georgia PPO",
      id: "KP444555666",
      group: "GRP-3690"
    },
    medical: {
      allergies: "Shellfish, Iodine contrast",
      medications: "Levothyroxine 100mcg daily, Calcium supplement",
      pcp: "Dr. Lisa Patel, Kaiser Sandy Springs",
      imaging: "Carotid ultrasound shows 60% stenosis"
    },
    pathology: {
      complaint: "Carotid artery blockage found on screening",
      area: "Right carotid artery",
      duration: "Recently discovered",
      painLevel: "0/10",
      symptoms: "No symptoms, found on routine screening",
      treatments: "Aspirin started, statin therapy optimized"
    },
    condition: "Carotid Artery Stenosis"
  },
  {
    firstName: "James",
    lastName: "Wilson",
    age: 77,
    gender: "Male",
    dob: "1947-05-19",
    phone: "+14045557890",
    email: "james.wilson@email.com",
    address: "147 Cedar Road, Alpharetta, GA 30022",
    insurance: {
      provider: "Wellcare",
      plan: "Medicare Advantage Classic",
      id: "WCR888999000",
      group: "MCARE-456"
    },
    medical: {
      allergies: "Morphine",
      medications: "Lisinopril 20mg daily, Carvedilol 25mg BID, Aspirin 81mg, Pravastatin 40mg",
      pcp: "Dr. Thomas Harris, North Fulton Family Practice",
      imaging: "CT angiogram shows 4.8cm abdominal aortic aneurysm"
    },
    pathology: {
      complaint: "Abdominal aortic aneurysm surveillance",
      area: "Infrarenal abdominal aorta",
      duration: "Known for 18 months",
      painLevel: "0/10",
      symptoms: "Asymptomatic, monitoring growth",
      treatments: "Blood pressure control, smoking cessation"
    },
    condition: "Abdominal Aortic Aneurysm"
  },
  {
    firstName: "Patricia",
    lastName: "Moore",
    age: 63,
    gender: "Female",
    dob: "1961-08-27",
    phone: "+14045558901",
    email: "patricia.moore@email.com",
    address: "258 Willow Way, Duluth, GA 30096",
    insurance: {
      provider: "Anthem",
      plan: "Blue Cross Blue Shield PPO",
      id: "ANT222333444",
      group: "GRP-7891"
    },
    medical: {
      allergies: "Erythromycin",
      medications: "Amlodipine 10mg daily, Hydrochlorothiazide 25mg daily",
      pcp: "Dr. Nancy Kim, Gwinnett Primary Care",
      imaging: "Venous reflux study positive for saphenous incompetence"
    },
    pathology: {
      complaint: "Leg ulcer not healing",
      area: "Left medial ankle",
      duration: "4 months",
      painLevel: "6/10",
      symptoms: "Open wound, drainage, surrounding skin changes",
      treatments: "Wound care, compression wraps, antibiotics"
    },
    condition: "Venous Stasis Ulcer"
  },
  {
    firstName: "Michael",
    lastName: "Brown",
    age: 59,
    gender: "Male",
    dob: "1965-02-11",
    phone: "+14045559012",
    email: "michael.brown@email.com",
    address: "369 Spruce Street, Kennesaw, GA 30144",
    insurance: {
      provider: "Ambetter",
      plan: "Balanced Care 5",
      id: "AMB333444555",
      group: "GRP-1357"
    },
    medical: {
      allergies: "None known",
      medications: "Losartan 50mg daily, Rosuvastatin 10mg daily",
      pcp: "Dr. Kevin Rogers, Kennesaw Family Health",
      imaging: "Venous mapping completed for access planning"
    },
    pathology: {
      complaint: "Needs dialysis access placement",
      area: "Left arm for AV fistula",
      duration: "Chronic kidney disease stage 4",
      painLevel: "N/A",
      symptoms: "Planning for future dialysis needs",
      treatments: "Renal diet, medication management"
    },
    condition: "Dialysis Access Planning"
  },
  {
    firstName: "Jennifer",
    lastName: "Davis",
    age: 51,
    gender: "Female",
    dob: "1973-06-25",
    phone: "+14045550123",
    email: "jennifer.davis@email.com",
    address: "741 Magnolia Boulevard, Johns Creek, GA 30097",
    insurance: {
      provider: "Oscar Health",
      plan: "Oscar Simple Silver",
      id: "OSC555666777",
      group: "GRP-2580"
    },
    medical: {
      allergies: "Sulfa drugs",
      medications: "None currently",
      pcp: "Dr. Rachel Green, Johns Creek Medical",
      imaging: "Ultrasound shows reticular veins"
    },
    pathology: {
      complaint: "Restless leg syndrome and visible veins",
      area: "Both legs",
      duration: "1 year",
      painLevel: "3/10",
      symptoms: "Nighttime restlessness, cosmetic concerns, mild aching",
      treatments: "Iron supplements tried, sleep hygiene"
    },
    condition: "Venous Insufficiency with Restless Legs"
  }
];

const generateInsuranceCardUrl = (provider: string, memberId: string) => {
  return `https://images.unsplash.com/photo-1554224311-beee4ead6ac2?w=800&q=80&fit=crop&crop=center`;
};

const generateIntakeNotes = (profile: typeof patientProfiles[0]) => {
  return `Contact: Name: ${profile.firstName} ${profile.lastName}, Phone: ${profile.phone}, Email: ${profile.email}, DOB: ${profile.dob}, Address: ${profile.address}

Insurance: Provider: ${profile.insurance.provider}, Plan: ${profile.insurance.plan}, Member ID: ${profile.insurance.id}, Group Number: ${profile.insurance.group}

Demographics: Age: ${profile.age}, Gender: ${profile.gender}

Chief Complaint: ${profile.pathology.complaint}
Affected Area: ${profile.pathology.area}
Duration: ${profile.pathology.duration}
Pain Level: ${profile.pathology.painLevel}
Symptoms: ${profile.pathology.symptoms}
Previous Treatments: ${profile.pathology.treatments}

Medical History:
- Allergies: ${profile.medical.allergies}
- Current Medications: ${profile.medical.medications}
- Primary Care Provider: ${profile.medical.pcp}
- Imaging/Studies: ${profile.medical.imaging}

Working Diagnosis: ${profile.condition}`;
};

const generateAISummary = (profile: typeof patientProfiles[0]) => {
  return `${profile.age}-year-old ${profile.gender.toLowerCase()} presenting with ${profile.pathology.complaint.toLowerCase()}. Patient reports ${profile.pathology.painLevel} pain severity in ${profile.pathology.area.toLowerCase()}. Symptoms include ${profile.pathology.symptoms.toLowerCase()}. Duration: ${profile.pathology.duration}. Currently on ${profile.medical.medications}. ${profile.insurance.provider} ${profile.insurance.plan} coverage verified. ${profile.medical.imaging}. Clinical impression: ${profile.condition}. Patient scheduled for vascular consultation.`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting PPM Test Account demo data population...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all PPM Test Account appointments
    const { data: appointments, error: fetchError } = await supabase
      .from('all_appointments')
      .select('id, lead_name, lead_phone_number')
      .eq('project_name', 'PPM - Test Account')
      .order('created_at');

    if (fetchError) {
      console.error('❌ Error fetching appointments:', fetchError);
      throw fetchError;
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No appointments found for PPM - Test Account' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${appointments.length} appointments to populate`);

    // Update each appointment with rotated profile data
    let successCount = 0;
    let failureCount = 0;

    for (let index = 0; index < appointments.length; index++) {
      const appointment = appointments[index];
      const profileIndex = index % patientProfiles.length;
      const profile = patientProfiles[profileIndex];

      // Add variation to phone numbers to avoid duplicates
      const phoneVariation = String(1234 + index).padStart(4, '0');
      const uniquePhone = `+1404555${phoneVariation}`;

      const updateData = {
        lead_name: `${profile.firstName} ${profile.lastName}`,
        lead_phone_number: uniquePhone,
        lead_email: profile.email,
        dob: profile.dob,
        patient_intake_notes: generateIntakeNotes(profile),
        parsed_demographics: {
          age: profile.age.toString(),
          gender: profile.gender,
          dob: profile.dob
        },
        parsed_contact_info: {
          name: `${profile.firstName} ${profile.lastName}`,
          phone: uniquePhone,
          email: profile.email,
          address: profile.address,
          dob: profile.dob
        },
        parsed_insurance_info: {
          insurance_provider: profile.insurance.provider,
          insurance_plan: profile.insurance.plan,
          insurance_id_number: profile.insurance.id,
          insurance_group_number: profile.insurance.group
        },
        parsed_pathology_info: {
          primary_complaint: profile.pathology.complaint,
          affected_area: profile.pathology.area,
          duration: profile.pathology.duration,
          pain_level: profile.pathology.painLevel,
          symptoms: profile.pathology.symptoms,
          previous_treatments: profile.pathology.treatments,
          working_diagnosis: profile.condition
        },
        parsed_medical_info: {
          allergies: profile.medical.allergies,
          medications: profile.medical.medications,
          pcp: profile.medical.pcp,
          imaging: profile.medical.imaging
        },
        detected_insurance_provider: profile.insurance.provider,
        detected_insurance_plan: profile.insurance.plan,
        detected_insurance_id: profile.insurance.id,
        insurance_detection_confidence: 0.95,
        insurance_id_link: generateInsuranceCardUrl(profile.insurance.provider, profile.insurance.id),
        ai_summary: generateAISummary(profile),
        parsing_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('all_appointments')
        .update(updateData)
        .eq('id', appointment.id);

      if (updateError) {
        console.error(`❌ Error updating appointment ${appointment.id}:`, updateError);
        failureCount++;
      } else {
        console.log(`✅ Updated appointment ${index + 1}/${appointments.length}: ${profile.firstName} ${profile.lastName}`);
        successCount++;
      }
    }

    console.log(`\n🎉 Population complete!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed: appointments.length,
        successCount,
        failureCount,
        message: `Populated ${successCount} of ${appointments.length} appointments with comprehensive demo data`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in populate-ppm-demo:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
