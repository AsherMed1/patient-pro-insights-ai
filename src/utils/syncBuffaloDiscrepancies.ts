import { supabase } from "@/integrations/supabase/client";

interface UpdatePayload {
  appointmentId: string;
  updates: Record<string, any>;
  description: string;
}

const updates: UpdatePayload[] = [
  // Group 1: confirmed → Welcome Call (20 appointments)
  {
    appointmentId: "e4c85403-ab59-4ad1-af61-d99497f79819",
    updates: { status: "Welcome Call" },
    description: "Annie R Kelly - Status fix"
  },
  {
    appointmentId: "dfff684a-05eb-4146-af20-a981548e1f5a",
    updates: { status: "Welcome Call" },
    description: "Bonnie Cooper - Status fix"
  },
  {
    appointmentId: "7ece0c0b-00c1-4736-94fd-37a0fbef62cb",
    updates: { status: "Welcome Call" },
    description: "Darrell Glover - Status fix"
  },
  {
    appointmentId: "d0345dbc-75f7-472b-9901-6d1316618afa",
    updates: { status: "Welcome Call" },
    description: "David O'Donnell - Status fix"
  },
  {
    appointmentId: "83bd30f2-3cf6-4fc0-b95c-eaed10bff14b",
    updates: { status: "Welcome Call" },
    description: "Deborah Fambo - Status fix"
  },
  {
    appointmentId: "16d4e448-d2e1-4e97-9056-530ce353ddfd",
    updates: { status: "Welcome Call" },
    description: "Gregory Taylor - Status fix"
  },
  {
    appointmentId: "642563c6-1b1c-4f4b-a9a0-d43972e1afd3",
    updates: { status: "Welcome Call" },
    description: "James W Peppard - Status fix"
  },
  {
    appointmentId: "c8e69341-2bf9-446f-8c74-ce660edbe7f2",
    updates: { status: "Welcome Call" },
    description: "Jennifer Mckie - Status fix"
  },
  {
    appointmentId: "b72e86f3-f097-4811-8f8a-461de7671d81",
    updates: { status: "Welcome Call" },
    description: "Jennifer Turner - Status fix"
  },
  {
    appointmentId: "188ede19-e436-45d3-9899-6f26c958f190",
    updates: { status: "Welcome Call" },
    description: "Joseph Mortellaroo - Status fix"
  },
  {
    appointmentId: "7664930c-1709-4273-bd46-527d6190d925",
    updates: { status: "Welcome Call" },
    description: "Katherine Davis - Status fix"
  },
  {
    appointmentId: "5aef7c4d-d808-4856-b5a6-b0c38fa6a773",
    updates: { status: "Welcome Call" },
    description: "Kathy Grimes - Status fix"
  },
  {
    appointmentId: "4faeb4ed-ee11-4b42-9f27-af47eb4e779e",
    updates: { status: "Welcome Call" },
    description: "Kristel Bentkowski - Status fix"
  },
  {
    appointmentId: "e484e187-e12f-4326-9d20-fd2cd6f2946d",
    updates: { status: "Welcome Call" },
    description: "Mark Johnson - Status fix"
  },
  {
    appointmentId: "677d04b3-9322-4249-bc01-0af3fcaafed0",
    updates: { status: "Welcome Call" },
    description: "Mary Roberts - Status fix"
  },
  {
    appointmentId: "89edf90e-ea7c-4d8d-b3a4-ea47c292dbfd",
    updates: { status: "Welcome Call" },
    description: "Michael G Bielski - Status fix"
  },
  {
    appointmentId: "df4e280c-f971-4d2b-a1f0-836ff1480c15",
    updates: { status: "Welcome Call" },
    description: "Michaeline White - Status fix"
  },
  {
    appointmentId: "43ec83f2-ae8c-4074-82df-2d2caf17e965",
    updates: { status: "Welcome Call" },
    description: "Nary Phonetheva - Status fix"
  },
  {
    appointmentId: "4b46b36f-3467-49c6-ab82-42a00b3c4f11",
    updates: { status: "Welcome Call" },
    description: "Peter Cassidy - Status fix"
  },
  {
    appointmentId: "75e9b12f-967f-4417-8eff-88d937db8e56",
    updates: { status: "Welcome Call" },
    description: "Scott Hastreiter - Status fix"
  },
  // Group 2: Welcome Call → Rescheduled (2 appointments)
  {
    appointmentId: "2bf17a8a-7e67-499c-b520-b83841a5b0bf",
    updates: { status: "Rescheduled" },
    description: "Nadine John - Status fix"
  },
  {
    appointmentId: "3c363ae6-1fab-4558-b366-e59e65a3f412",
    updates: { status: "Rescheduled" },
    description: "Ralph STODDARD - Status fix"
  }
];

export async function syncBuffaloDiscrepancies() {
  console.log("🔄 Starting Buffalo Vascular Care discrepancy sync...");
  console.log(`📝 Processing ${updates.length} appointments\n`);

  const results = [];

  for (const update of updates) {
    try {
      console.log(`⏳ ${update.description}...`);
      
      const { data, error } = await supabase.functions.invoke('update-appointment-fields', {
        body: {
          appointmentId: update.appointmentId,
          updates: update.updates
        }
      });

      if (error) {
        console.error(`❌ Failed: ${update.description}`, error);
        results.push({ ...update, success: false, error });
      } else {
        console.log(`✅ Success: ${update.description}`);
        results.push({ ...update, success: true, data });
      }
    } catch (err) {
      console.error(`❌ Error: ${update.description}`, err);
      results.push({ ...update, success: false, error: err });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log("\n📊 Sync Summary:");
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📝 Total: ${updates.length}`);

  return results;
}

// Run automatically when imported (for testing)
if (import.meta.env.DEV) {
  console.log("💡 To run sync: import and call syncBuffaloDiscrepancies()");
}
