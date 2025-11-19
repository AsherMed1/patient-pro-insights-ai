import { supabase } from "@/integrations/supabase/client";

export const deleteWillodeneBrownDuplicate = async () => {
  console.log('Deleting duplicate Willodene Brown record...');
  
  const duplicateId = '3bda27cc-39aa-4b50-b8c8-a1f75f618e92';
  
  const { error } = await supabase
    .from('new_leads')
    .delete()
    .eq('id', duplicateId);
  
  if (error) {
    console.error('Error deleting duplicate Willodene Brown record:', error);
    return { success: false, error };
  }
  
  console.log('Successfully deleted duplicate Willodene Brown record');
  return { success: true };
};
