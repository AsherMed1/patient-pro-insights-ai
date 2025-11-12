import { supabase } from "@/integrations/supabase/client";

interface UpdatePayload {
  appointmentId: string;
  updates: Record<string, any>;
  description: string;
}

const updates: UpdatePayload[] = [
  {
    appointmentId: "ba0398fa-4203-4377-9032-0e758fab0c20",
    updates: {
      date_of_appointment: "2025-11-05",
      requested_time: "20:30:00"
    },
    description: "Joseph Schanne - Date/Time fix"
  },
  {
    appointmentId: "2bf17a8a-7e67-499c-b520-b83841a5b0bf",
    updates: {
      date_of_appointment: "2025-11-04",
      requested_time: "08:00:00"
    },
    description: "Nadine John - Date/Time fix"
  },
  {
    appointmentId: "9c2ef9e8-6c5f-4668-b326-76fef69400db",
    updates: {
      status: "Welcome Call"
    },
    description: "Marie Nasr - Status fix"
  },
  {
    appointmentId: "19ea9ca6-3c19-4232-9fb8-001894b8a8a8",
    updates: {
      status: "Welcome Call"
    },
    description: "Jack Raymond - Status fix"
  },
  {
    appointmentId: "70661ada-01f9-42fa-a247-f0b677339106",
    updates: {
      status: "Chart Created"
    },
    description: "Gary Parker - Status fix"
  },
  {
    appointmentId: "4856ae9b-7a5a-4226-b28f-40007485fff0",
    updates: {
      procedure_ordered: true
    },
    description: "Roxane Amborski - Procedure ordered fix"
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
