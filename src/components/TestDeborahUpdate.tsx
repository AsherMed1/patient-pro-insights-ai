import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TestDeborahUpdate = () => {
  const updateDeborahData = async () => {
    const formattedNotes = `Contact: Name: Deborah Wampler, Phone: (208) 809-7215, Email: wampler.deborah@yahoo.com, Patient ID: ZMQXu8Q0eF7XCUfMfCy6 /n Insurance: Alt Selection: Humana /n Pathology (GAE): Duration: Over 1 year, OA or TKR Diagnosed: YES, Age Range: 56 and above, Trauma-related Onset: NO, Pain Level: 8, Symptoms: Stiffness, Swelling, Sharp Pain, Treatments Tried: Injections, Physical therapy, Knee replacement, Medications/pain pills, Imaging Done: YES, Other: NO`;

    try {
      // Update lead record
      const { error: leadError } = await supabase
        .from('new_leads')
        .update({ patient_intake_notes: formattedNotes })
        .eq('contact_id', 'ZMQXu8Q0eF7XCUfMfCy6');

      if (leadError) throw leadError;

      // Update appointment record
      const { error: appointmentError } = await supabase
        .from('all_appointments')
        .update({ patient_intake_notes: formattedNotes })
        .eq('ghl_id', 'ZMQXu8Q0eF7XCUfMfCy6');

      if (appointmentError) throw appointmentError;

      toast.success("Successfully updated Deborah Wampler's records with formatted patient intake notes!");
    } catch (error) {
      console.error('Error updating records:', error);
      toast.error("Failed to update records");
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-yellow-50">
      <h3 className="font-medium mb-2">Test: Update Deborah Wampler's Data</h3>
      <p className="text-sm text-gray-600 mb-3">
        This will populate Deborah's records with formatted patient intake notes to test the display.
      </p>
      <Button onClick={updateDeborahData} variant="outline" size="sm">
        Update Deborah's Data
      </Button>
    </div>
  );
};

export default TestDeborahUpdate;